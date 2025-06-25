import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { FilterQuery, Model } from "mongoose";
import {
  RESPONSE_ERROR,
  RESPONSE_SUCCESS,
} from "src/common/constants/response.constant";
import { CustomError, TypeExceptions } from "src/common/helpers/exceptions";
import { Company, CompanyDocument } from "src/common/schema/company.schema";
import { Facility, FacilityDocument } from "src/common/schema/facility.schema";
import {
  CompanyListDto,
  CreateCompanyDto,
  EditCompanyDto,
  UpdateCompanyStatusDto,
} from "./dto/company.dto";
import { Request } from "express";
import { CompanyStatus } from "src/common/constants/enum.constant";
import { TABLE_NAMES } from "src/common/constants/table-name.constant";
import { Chiller } from "src/common/schema/chiller.schema";

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    @InjectModel(Facility.name)
    private readonly facilityModel: Model<FacilityDocument>,
    @InjectModel(Chiller.name)
    private readonly chillerModel: Model<FacilityDocument>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto) {
    // Step 1: Check if the company with the same name already exists
    try {
      const existingCompany = await this.companyModel.findOne({
        name: createCompanyDto.name,
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
          await facility.save();
          facilityIds.push(facility._id as mongoose.Types.ObjectId);
        }

        // Step 8: After saving the facilities, assign the facility IDs to the company document and update the total facilities count
        company.facilities = facilityIds;
        company.totalFacilities = facilityIds.length;
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
        await existingCompany.save(); // Save the updated company document
      }
      return {};
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async findAllNotDeleted() {
    return this.companyModel.find({ isDeleted: false }).exec();
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
                  "$address1",
                  ", ",
                  "$address2",
                  ", ",
                  "$city",
                  ", ",
                  "$state",
                  ", ",
                  "$country",
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

  async findOne(id: string) {
    try {
      const matchObj: FilterQuery<CompanyDocument> = {};
      matchObj.isDeleted = false;
      matchObj._id = new mongoose.Types.ObjectId(id);
      const pipeline = [];
      pipeline.push({
        $match: matchObj,
      });
      pipeline.push(
        {
          $lookup: {
            from: TABLE_NAMES.FACILITY,
            localField: "_id",
            foreignField: "companyId",
            as: "facilities",
          },
        },
        {
          $addFields: {
            totalOperators: 0, // Convert name to lowercase for sorting
          },
        },
        {
          $project: {
            name: 1,
            // address: 1,
            companyCode: 1,
            address: {
              $concat: [
                "$address1",
                ", ",
                "$address2",
                ", ",
                "$city",
                ", ",
                "$state",
                ", ",
                "$country",
              ],
            },
            website: 1,
            status: 1,
            isDeleted: 1,
            isAssign: 1,
            totalFacilities: 1,
            totalChiller: 1,
            createdAt: 1,
            facilities: 1,
            totalOperators: 1,
            address1: 1,
            address2: 1,

            city: 1,
            state: 1,
            country: 1,
            zipcode: 1,
          },
        },
      );
      const result = await this.companyModel.aggregate(pipeline);
      return result.length ? result[0] : [];
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.statusCode);
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

      // If the company is being deactivated, deactivate all facilities and chillers under this company
      if (status === CompanyStatus.IN_ACTIVE) {
        // Deactivate all facilities under this company
        // const facilities = await this.facilityModel.find({
        //   companyId: companyId,
        // });

        if (company.facilities.length > 0) {
          // Deactivate all facilities
          await this.facilityModel.updateMany(
            { _id: { $in: company.facilities } },
            { $set: { isActive: false } },
          );

          // Deactivate all chillers under those facilities
          // const facilityIds = company.facilities.map((facility) => facility._id);
          const chillers = await this.chillerModel.find({
            facilityId: { $in: company.facilities },
          });

          if (chillers.length > 0) {
            await this.chillerModel.updateMany(
              { _id: { $in: chillers.map((chiller) => chiller._id) } },
              { $set: { isActive: false } },
            );
          }
        }
      }

      const message =
        status == CompanyStatus.ACTIVE
          ? RESPONSE_SUCCESS.COMPANY_ACTIVATED
          : RESPONSE_SUCCESS.COMPANY_DEACTIVATED;
      console.log("✌️message --->", message);

      await company.save();

      return {
        status: "success",
        message: message,
        data: {},
      };
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
}
