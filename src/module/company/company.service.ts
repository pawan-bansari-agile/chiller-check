import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { FilterQuery, Model } from "mongoose";
import {
  RESPONSE_ERROR,
  RESPONSE_SUCCESS,
  USER,
} from "src/common/constants/response.constant";
import { CustomError, TypeExceptions } from "src/common/helpers/exceptions";
import { Company, CompanyDocument } from "src/common/schema/company.schema";
import { Facility, FacilityDocument } from "src/common/schema/facility.schema";
import {
  CompanyListDto,
  CreateCompanyDto,
  EditCompanyDto,
  UnassignedCompanyListDto,
  UpdateCompanyStatusDto,
} from "./dto/company.dto";
import { Request } from "express";
import {
  CHILLER_STATUS,
  CompanyStatus,
  Role,
} from "src/common/constants/enum.constant";
import { TABLE_NAMES } from "src/common/constants/table-name.constant";
import { Chiller } from "src/common/schema/chiller.schema";
import { User } from "src/common/schema/user.schema";
import { EmailService } from "src/common/helpers/email/email.service";
import { companyInactivationTemplate } from "src/common/helpers/email/emailTemplates/companyInactivatedTemplate";

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    @InjectModel(Facility.name)
    private readonly facilityModel: Model<FacilityDocument>,
    @InjectModel(Chiller.name)
    private readonly chillerModel: Model<FacilityDocument>,
    @InjectModel(User.name) private readonly userModel: Model<User>,

    private emailService: EmailService,
  ) {}

  async create(createCompanyDto: CreateCompanyDto) {
    // Step 1: Check if the company with the same name already exists
    try {
      // const existingCompany = await this.companyModel.findOne({
      //   name: createCompanyDto.name,
      // });

      const existingCompany = await this.companyModel.findOne({
        name: {
          $regex: `^${escapeRegex(createCompanyDto.name)}$`,
          $options: "i",
        },
      });

      if (existingCompany) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.COMPANY_ALREADY_EXISTS,
        );
      }

      const {
        name,
        address1,
        address2,
        city,
        state,
        country,
        zipcode,
        website,
        facilities = [], // Optional facilities in the payload
      } = createCompanyDto;

      const companyCode = Math.floor(100000 + Math.random() * 900000);

      // Step 2: Create the company object without saving it yet
      const company = await this.companyModel.create({
        name,
        companyCode,
        address1,
        address2,
        city,
        state,
        country,
        zipcode,
        website,
        status: CompanyStatus.PROSPECT,
      });

      // Step 3: Check if any facility names are provided in the payload
      if (facilities.length > 0) {
        const facilityNames = facilities.map((facility) => facility.name);

        // Check if there are any duplicate facility names in the provided payload
        const duplicateFacilityNames = facilityNames.filter(
          (value, index, self) => self.indexOf(value) !== index,
        );

        if (duplicateFacilityNames.length > 0) {
          throw TypeExceptions.BadRequestCommonFunction(
            RESPONSE_ERROR.DUPLICATE_FACILITY_NAMES_IN_PAYLOAD,
          );
        }

        // Step 4: Check if any of the facilities with the same name already exist under the same company
        const existingCompanyFacilities = await this.facilityModel.find({
          companyId: company._id,
          name: { $in: facilityNames },
        });

        if (existingCompanyFacilities.length > 0) {
          throw TypeExceptions.BadRequestCommonFunction(
            RESPONSE_ERROR.DUPLICATE_FACILITY_NAMES_IN_PAYLOAD,
          );
        }

        // Step 5: Create facility objects without saving them yet
        const facilitiesToSave = facilities.map((facilityInput) => {
          // return new this.facilityModel({
          //   ...facilityInput,
          //   companyId: company._id, // Attach the companyId
          //   facilityCode: Math.floor(100000 + Math.random() * 900000),
          // });
          return {
            ...facilityInput,
            companyId: company._id, // Attach the companyId
            facilityCode: Math.floor(100000 + Math.random() * 900000),
          };
        });

        // Step 6: Check if the facilities have any existing duplicates under the company
        const facilityNamesToCheck = facilitiesToSave.map(
          (facility) => facility.name,
        );

        const existingFacilities = await this.facilityModel.find({
          companyId: company._id,
          name: { $in: facilityNamesToCheck },
        });

        if (existingFacilities.length > 0) {
          throw TypeExceptions.BadRequestCommonFunction(
            RESPONSE_ERROR.FACILITY_NAME_EXISTS,
          );
        }

        // Step 7: Now that all checks have passed, save the company and facilities
        // await company.save();
        const createdFacilities =
          await this.facilityModel.create(facilitiesToSave);

        const facilityIds: mongoose.Types.ObjectId[] = [];

        for (const facility of createdFacilities) {
          facilityIds.push(facility._id as mongoose.Types.ObjectId);
          await facility.save();
        }

        // Step 8: After saving the facilities, assign the facility IDs to the company document and update the total facilities count
        company.facilities = facilityIds;
        company.totalFacilities = facilityIds.length;
        company.freeTrialEndDate = undefined;
        await company.save(); // Save the updated company document
      } else {
        // If no facilities are provided, just save the company without facilities
        await company.save();
      }

      return company;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async updateCompany(id: string, body: EditCompanyDto) {
    try {
      const facilities = body.facilities;

      // First check if company exists
      const existingCompany = await this.companyModel.findOne({
        _id: new mongoose.Types.ObjectId(id),
        isDeleted: false,
      });

      if (!existingCompany) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.COMPANY_NOT_FOUND,
        );
      }

      // Check for duplicate name in other companies
      const duplicateCompany = await this.companyModel.findOne({
        _id: { $ne: new mongoose.Types.ObjectId(id) }, // exclude current company
        name: body.name,
        isDeleted: false,
      });

      if (duplicateCompany) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.COMPANY_ALREADY_EXISTS,
        );
      }

      // Now perform update
      await this.companyModel.updateOne(
        { _id: id },
        {
          $set: {
            name: body.name,
            address1: body.address1,
            address2: body.address2,
            city: body.city,
            state: body.state,
            country: body.country,
            zipcode: body.zipcode,
            website: body.website,
            freeTrialEndDate: new Date(Date.now() + 60 * 1000),
          },
        },
      );

      if (facilities.length > 0) {
        const facilityNames = facilities.map((facility) => facility.name);

        // Check if there are any duplicate facility names in the provided payload
        const duplicateFacilityNames = facilityNames.filter(
          (value, index, self) => self.indexOf(value) !== index,
        );

        if (duplicateFacilityNames.length > 0) {
          throw TypeExceptions.BadRequestCommonFunction(
            RESPONSE_ERROR.DUPLICATE_FACILITY_NAMES_IN_PAYLOAD,
          );
        }

        // Step 4: Check if any of the facilities with the same name already exist under the same company
        const existingCompanyFacilities = await this.facilityModel.find({
          companyId: new mongoose.Types.ObjectId(id),
          name: { $in: facilityNames },
        });

        if (existingCompanyFacilities.length > 0) {
          throw TypeExceptions.BadRequestCommonFunction(
            RESPONSE_ERROR.DUPLICATE_FACILITY_NAMES_IN_PAYLOAD,
          );
        }

        // Step 5: Create facility objects without saving them yet
        const facilitiesToSave = facilities.map((facilityInput) => {
          return {
            ...facilityInput,
            companyId: new mongoose.Types.ObjectId(id), // Attach the companyId
            facilityCode: Math.floor(100000 + Math.random() * 900000),
          };
        });

        // Step 6: Check if the facilities have any existing duplicates under the company
        const facilityNamesToCheck = facilitiesToSave.map(
          (facility) => facility.name,
        );

        const existingFacilities = await this.facilityModel.find({
          companyId: new mongoose.Types.ObjectId(id),
          name: { $in: facilityNamesToCheck },
        });

        if (existingFacilities.length > 0) {
          throw TypeExceptions.BadRequestCommonFunction(
            RESPONSE_ERROR.FACILITY_NAME_EXISTS,
          );
        }

        // Step 7: Now that all checks have passed, save the company and facilities
        // await company.save();
        const createdFacilities =
          await this.facilityModel.create(facilitiesToSave);

        const facilityIds: mongoose.Types.ObjectId[] =
          existingCompany.facilities;

        for (const facility of createdFacilities) {
          await facility.save();
          facilityIds.push(facility._id as mongoose.Types.ObjectId);
        }

        // Step 8: After saving the facilities, assign the facility IDs to the company document and update the total facilities count
        existingCompany.facilities = facilityIds;
        existingCompany.totalFacilities = facilityIds.length;
        // existingCompany.freeTrialEndDate = new Date(Date.now() + 60 * 1000);
        await existingCompany.save(); // Save the updated company document
      }
      return {};
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async findAllNotDeleted(req: Request) {
    const findUser = await this.userModel.findOne({
      _id: req["user"]["_id"],
    });
    if (!findUser) {
      throw TypeExceptions.BadRequestCommonFunction(USER.USER_NOT_FOUND);
    }
    if (req["user"]["role"] == Role.CORPORATE_MANAGER) {
      if (findUser.companyId) {
        return this.companyModel
          .find({ _id: findUser.companyId, isDeleted: false })
          .exec();
      }
    } else {
      return this.companyModel.find({ isDeleted: false }).exec();
    }
  }

  async findAllNotAssigned(body: UnassignedCompanyListDto) {
    // return this.companyModel.find({ isAssign: false }).exec();
    try {
      const { page = 1, limit = 10, sort_by, sort_order = "desc" } = body;

      if (!page || !limit || page <= 0 || limit <= 0) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.INVALID_PAGE_AND_LIMIT_VALUE,
        );
      }

      const skip = (page - 1) * limit;

      const matchObj = {
        isDeleted: false,
        isAssign: false,
      };

      const pipeline = [];

      pipeline.push({ $match: matchObj });

      const sortField =
        !sort_by || sort_by.trim() === ""
          ? "createdAt"
          : sort_by === "name"
            ? "nameLower"
            : sort_by;

      if (sortField === "nameLower") {
        pipeline.push({
          $addFields: {
            nameLower: { $toLower: "$name" },
          },
        });
      }

      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.FACILITY, // 'facilities' collection
          localField: "_id",
          foreignField: "companyId",
          as: "facilities",
        },
      });

      pipeline.push({
        $addFields: {
          totalOperators: {
            $sum: "$facilities.totalOperators",
          },
        },
      });

      pipeline.push({
        $project: {
          _id: 1,
          name: 1,
          website: 1,
          companyCode: 1,
          status: 1,
          isAssign: 1,
          createdAt: 1,
          nameLower: 1,
          totalFacilities: 1,
          totalChiller: 1,
          totalOperators: 1,
        },
      });

      pipeline.push({
        $sort: {
          [sortField]: sort_order === "ASC" ? 1 : -1,
        },
      });

      pipeline.push({
        $facet: {
          companyList: [{ $skip: skip }, { $limit: limit }],
          totalRecords: [{ $count: "count" }],
        },
      });

      const result = await this.companyModel.aggregate(pipeline);

      return {
        companyList: result[0]?.companyList || [],
        totalRecords: result[0]?.totalRecords?.[0]?.count || 0,
      };
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.statusCode);
    }
  }

  async findAll(req: Request, body: CompanyListDto) {
    console.log(req["user"], "body: ", body);
    try {
      const limit = body.limit;
      const page = body.page;
      const skip = (page - 1) * limit;
      const { search, sort_by, sort_order = "desc" } = body;
      const matchObj: FilterQuery<CompanyDocument> = {};
      matchObj.isDeleted = false;
      const pipeline = [];
      pipeline.push({
        $match: matchObj,
      });

      pipeline.push(
        {
          $group: {
            _id: "$_id", // Group by staff member ID
            address: {
              $first: {
                $concat: [
                  { $ifNull: ["$address1", ""] },
                  ", ",
                  {
                    $cond: {
                      if: { $ne: [{ $ifNull: ["$address2", ""] }, ""] },
                      then: { $concat: [{ $ifNull: ["$address2", ""] }, ", "] },
                      else: "",
                    },
                  },
                  { $ifNull: ["$city", ""] },
                  ", ",
                  { $ifNull: ["$state", ""] },
                  ", ",
                  { $ifNull: ["$country", ""] },
                ],
              },
            },
            companyCode: { $first: "$companyCode" },
            website: { $first: "$website" },
            isDeleted: { $first: "$isDeleted" },
            name: { $first: "$name" },
            createdAt: { $first: "$createdAt" },
            totalFacilities: { $first: "$totalFacilities" },
            totalChiller: { $first: "$totalChiller" },
            isAssign: { $first: "$isAssign" },
            status: { $first: "$status" },
          },
        },
        {
          $addFields: {
            nameLower: { $toLower: "$name" }, // Convert name to lowercase for sorting
          },
        },
        {
          $sort: {
            [sort_by === "name" ? "nameLower" : sort_by || "createdAt"]:
              sort_order === "ASC" ? 1 : -1,
          },
        },
        {
          $project: {
            name: 1,
            address: 1,
            companyCode: 1,
            website: 1,
            status: 1,
            isDeleted: 1,
            isAssign: 1,
            totalFacilities: 1,
            totalChiller: 1,
            createdAt: 1,
          },
        },
      );

      if (search) {
        // const normalizedSearch = search.replace(/\D/g, ""); // Remove all non-numeric characters
        // const isNumericSearch = /^\d+$/.test(normalizedSearch); // Check if the search is purely numeric

        let searchConditions = [];

        // if (isNumericSearch) {
        //   // If search is a phone number, normalize it and search only in phoneNumber field
        //   searchConditions.push({
        //     companyCode: { $regex: normalizedSearch, $options: "i" },
        //   });
        // } else {
        // Otherwise, search in all text-based fields
        searchConditions = [
          { name: { $regex: search.trim(), $options: "i" } },
          { address: { $regex: search.trim(), $options: "i" } },
          { website: { $regex: search.trim(), $options: "i" } },
          { status: { $regex: search.trim(), $options: "i" } },
          { companyCode: { $regex: search.trim(), $options: "i" } },
        ];
        // }

        pipeline.push({
          $match: {
            $or: searchConditions,
          },
        });
      }
      pipeline.push({
        $facet: {
          companyList: [{ $skip: skip }, { $limit: limit }],
          totalRecords: [{ $count: "count" }],
        },
      });

      const result = await this.companyModel.aggregate(pipeline);
      console.log("result-----: ", result);
      if (result?.length > 0) {
        result[0].totalRecords =
          result[0].totalRecords.length > 0
            ? result[0].totalRecords[0].count
            : 0;
        return result[0];
      } else {
        return {
          companyList: [],
          totalRecords: 0,
        };
      }
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.statusCode);
    }
  }

  // working code
  // async findOne(id: string) {
  //   try {
  //     const matchObj: FilterQuery<CompanyDocument> = {};

  //     matchObj.isDeleted = false;

  //     matchObj._id = new mongoose.Types.ObjectId(id);

  //     const pipeline = [];

  //     pipeline.push({
  //       $match: matchObj,
  //     });

  //     pipeline.push(
  //       {
  //         $lookup: {
  //           from: TABLE_NAMES.FACILITY,
  //           localField: '_id',
  //           foreignField: 'companyId',
  //           as: 'facilities',
  //         },
  //       },
  //       {
  //         $lookup: {
  //           from: TABLE_NAMES.CHILLER,
  //           let: { companyId: '$_id' },
  //           pipeline: [
  //             {
  //               $match: {
  //                 $expr: {
  //                   $eq: ['$companyId', '$$companyId'],
  //                 },
  //               },
  //             },
  //             {
  //               $lookup: {
  //                 from: TABLE_NAMES.FACILITY,
  //                 localField: 'facilityId',
  //                 foreignField: '_id',
  //                 as: 'facility',
  //               },
  //             },
  //             {
  //               $unwind: {
  //                 path: '$facility',
  //                 preserveNullAndEmptyArrays: true,
  //               },
  //             },
  //           ],
  //           as: 'chillers',
  //         },
  //       },
  //       {
  //         $addFields: {
  //           totalOperators: 0, // Convert name to lowercase for sorting
  //         },
  //       },
  //       {
  //         $project: {
  //           name: 1,
  //           // address: 1,
  //           companyCode: 1,
  //           address: {
  //             $concat: [
  //               '$address1',
  //               ', ',
  //               '$address2',
  //               ', ',
  //               '$city',
  //               ', ',
  //               '$state',
  //               ', ',
  //               '$country',
  //             ],
  //           },
  //           website: 1,
  //           status: 1,
  //           isDeleted: 1,
  //           isAssign: 1,
  //           totalFacilities: 1,
  //           totalChiller: 1,
  //           createdAt: 1,
  //           facilities: 1,
  //           chillers: 1,
  //           totalOperators: 1,
  //           address1: 1,
  //           address2: 1,
  //           city: 1,
  //           state: 1,
  //           country: 1,
  //           zipcode: 1,
  //         },
  //       }
  //     );
  //     const result = await this.companyModel.aggregate(pipeline);
  //     return result.length ? result[0] : [];
  //   } catch (error) {
  //     throw CustomError.UnknownError(error?.message, error?.statusCode);
  //   }
  // }

  // working code v1
  async findOne(companyId: string) {
    try {
      const objectId = new mongoose.Types.ObjectId(companyId);
      const pipeline = [];

      pipeline.push({
        $match: { _id: objectId, isDeleted: false },
      });

      // Lookup facilities
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.FACILITY,
          localField: "_id",
          foreignField: "companyId",
          as: "facilities",
        },
      });

      // Lookup all chillers for this company
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.CHILLER,
          localField: "_id",
          foreignField: "companyId",
          as: "chillers",
        },
      });

      // Lookup all users with role operator for this company
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.USERS,
          let: { chillerIds: "$chillers._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$role", Role.OPERATOR] },
                    { $eq: ["$isDeleted", false] },
                    {
                      $gt: [
                        {
                          $size: {
                            $ifNull: ["$chillerIds", []],
                          },
                        },
                        0,
                      ],
                    },
                    {
                      $setIsSubset: ["$chillerIds", "$$chillerIds"],
                    },
                  ],
                },
              },
            },
          ],
          as: "operators",
        },
      });

      // Add totalChiller and totalOperators per facility
      pipeline.push({
        $addFields: {
          facilities: {
            $map: {
              input: "$facilities",
              as: "fac",
              in: {
                $mergeObjects: [
                  "$$fac",
                  {
                    chillers: {
                      $map: {
                        input: {
                          $filter: {
                            input: "$chillers",
                            as: "ch",
                            cond: { $eq: ["$$ch.facilityId", "$$fac._id"] },
                          },
                        },
                        as: "chiller",
                        in: "$$chiller._id",
                      },
                    },
                    totalChiller: {
                      $size: {
                        $filter: {
                          input: "$chillers",
                          as: "ch",
                          cond: { $eq: ["$$ch.facilityId", "$$fac._id"] },
                        },
                      },
                    },
                    totalOperators: {
                      $size: {
                        $filter: {
                          input: "$operators",
                          as: "op",
                          cond: {
                            $gt: [
                              {
                                $size: {
                                  $filter: {
                                    input: "$$op.chillerIds",
                                    as: "cid",
                                    cond: {
                                      $in: [
                                        "$$cid",
                                        {
                                          $map: {
                                            input: {
                                              $filter: {
                                                input: "$chillers",
                                                as: "ch",
                                                cond: {
                                                  $eq: [
                                                    "$$ch.facilityId",
                                                    "$$fac._id",
                                                  ],
                                                },
                                              },
                                            },
                                            as: "ch",
                                            in: "$$ch._id",
                                          },
                                        },
                                      ],
                                    },
                                  },
                                },
                              },
                              0,
                            ],
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      });

      // Enrich chillers with facility data and totalOperators
      pipeline.push({
        $addFields: {
          chillers: {
            $map: {
              input: "$chillers",
              as: "chiller",
              in: {
                $mergeObjects: [
                  "$$chiller",
                  {
                    facility: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$facilities",
                            as: "f",
                            cond: {
                              $eq: ["$$f._id", "$$chiller.facilityId"],
                            },
                          },
                        },
                        0,
                      ],
                    },
                    totalOperators: {
                      $size: {
                        $filter: {
                          input: "$operators",
                          as: "op",
                          cond: {
                            $in: ["$$chiller._id", "$$op.chillerIds"],
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      });

      // Add total counts at company level
      pipeline.push({
        $addFields: {
          totalFacilities: { $size: "$facilities" },
          totalChiller: { $size: "$chillers" },
          totalOperators: { $size: "$operators" },
          address: {
            $concat: [
              { $ifNull: ["$address1", ""] },
              ", ",
              {
                $cond: {
                  if: { $ne: [{ $ifNull: ["$address2", ""] }, ""] },
                  then: { $concat: [{ $ifNull: ["$address2", ""] }, ", "] },
                  else: "",
                },
              },
              { $ifNull: ["$city", ""] },
              ", ",
              { $ifNull: ["$state", ""] },
              ", ",
              { $ifNull: ["$country", ""] },
            ],
          },
        },
      });

      // const [result] = await this.companyModel.aggregate(pipeline);
      // if (!result) throw CustomError.NotFound('Company not found');

      // return {
      //   statusCode: 200,
      //   message: 'Company Found.',
      //   data: result,
      // };
      const result = await this.companyModel.aggregate(pipeline);
      return result.length ? result[0] : [];
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async updateStatus(companyId: string, body: UpdateCompanyStatusDto) {
    try {
      const { status } = body;

      // Check if the company exists
      const company = await this.companyModel.findById(companyId);
      if (!company) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.COMPANY_NOT_FOUND,
        );
      }

      // Validate status field (it should only be "active" or "inactive")
      if (![CompanyStatus.ACTIVE, CompanyStatus.IN_ACTIVE].includes(status)) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.INVALID_COMPANY_STATUS,
        );
      }

      // Update the company status
      company.status = status;
      if (status == CompanyStatus.ACTIVE) {
        const now = new Date();
        const isTrialExpired =
          company.freeTrialEndDate &&
          now.getTime() >
            new Date(company.freeTrialEndDate).getTime() + 60 * 1000;

        if (isTrialExpired) {
          company.freeTrialEndDate = null;
        }
      }
      // If the company is being deactivated, deactivate all facilities and chillers under this company
      if (status === CompanyStatus.IN_ACTIVE) {
        // Deactivate all facilities under this company
        // const facilities = await this.facilityModel.find({
        //   companyId: companyId,
        // });

        const companyManager = await this.userModel.findOne({
          companyId: company._id,
          role: Role.CORPORATE_MANAGER,
        });

        if (companyManager) {
          await this.userModel.findOneAndUpdate(
            { _id: companyManager._id },
            { isProfileUpdated: true },
          );

          console.log("✌️companyManager --->", companyManager);

          const html = companyInactivationTemplate(
            `${companyManager.firstName} ${companyManager.lastName}`,
            companyManager.role,
          );

          await this.emailService.emailSender({
            to: companyManager.email,
            subject: `Your Company Status for ${company.name} has changed.`,
            html: html,
          });
        }

        if (company.facilities.length > 0) {
          // Deactivate all facilities
          await this.facilityModel.updateMany(
            { _id: { $in: company.facilities } },
            { $set: { isActive: false } },
          );

          const facilityManagers = await this.userModel.find({
            role: Role.FACILITY_MANAGER,
            facilityIds: { $in: company.facilities },
          });

          const facilityManagerIds = [];

          if (facilityManagers.length > 0) {
            facilityManagers.map((fm) => {
              facilityManagerIds.push({
                id: fm._id,
                role: fm.role,
                firstName: fm.firstName,
                lastName: fm.lastName,
                email: fm.email,
              });
            });
          }

          if (facilityManagerIds.length > 0) {
            facilityManagerIds.map(async (fm) => {
              const html = companyInactivationTemplate(
                `${fm.firstName} ${fm.lastName}`,
                fm.role,
              );

              await this.emailService.emailSender({
                to: fm.email,
                subject: `Your Company Status for ${company.name} has changed.`,
                html: html,
              });
            });
          }

          // Deactivate all chillers under those facilities
          // const facilityIds = company.facilities.map((facility) => facility._id);
          const chillers = await this.chillerModel.find({
            facilityId: { $in: company.facilities },
          });

          const chillerIds = [];

          if (chillers.length > 0) {
            chillers.map((c) => {
              chillerIds.push(c._id);
            });
          }

          if (chillers.length > 0) {
            await this.chillerModel.updateMany(
              { _id: { $in: chillers.map((chiller) => chiller._id) } },
              { $set: { status: CHILLER_STATUS.InActive } },
            );

            if (chillerIds.length > 0) {
              const operators = await this.userModel.find({
                role: Role.OPERATOR,
                chillerIds: { $in: chillerIds },
              });

              const operatorIds = [];

              operators.map((o) => {
                operatorIds.push(o._id);
              });
            }
          }
        }
      }

      const message =
        status == CompanyStatus.ACTIVE
          ? RESPONSE_SUCCESS.COMPANY_ACTIVATED
          : RESPONSE_SUCCESS.COMPANY_DEACTIVATED;
      console.log("✌️message --->", message);

      await company.save();

      return message;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async findAllActiveCompany() {
    const activeCompanies = await this.companyModel.find({
      status: CompanyStatus.ACTIVE,
    });

    if (activeCompanies.length == 0) {
      throw TypeExceptions.BadRequestCommonFunction(
        RESPONSE_ERROR.NO_ACTIVE_COMPANIES,
      );
    }

    return activeCompanies;
  }
}
