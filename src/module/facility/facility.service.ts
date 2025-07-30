import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { FilterQuery, Model } from "mongoose";
import {
  RESPONSE_ERROR,
  RESPONSE_SUCCESS,
  USER,
} from "src/common/constants/response.constant";
import { TABLE_NAMES } from "src/common/constants/table-name.constant";

import { CustomError, TypeExceptions } from "src/common/helpers/exceptions";
import { Chiller } from "src/common/schema/chiller.schema";
import { Company } from "src/common/schema/company.schema";
import { Facility, FacilityDocument } from "src/common/schema/facility.schema";
import {
  ActiveFacilities,
  CreateFacilityDTO,
  FacilityListDto,
  UpdateFacilityDto,
  UpdateFacilityStatusDto,
} from "./dto/facility.dto";
import { CreateChillerWithFacilityDTO } from "../chiller/dto/chiller.dto";
import {
  CHILLER_STATUS,
  ChillerStatus,
  MEASUREMENT_UNITS,
  Role,
} from "src/common/constants/enum.constant";
import { User } from "src/common/schema/user.schema";
import { facilityStatusTemplate } from "src/common/helpers/email/emailTemplates/facilityStatusTemplate";
import { EmailService } from "src/common/helpers/email/email.service";

@Injectable()
export class FacilityService {
  constructor(
    @InjectModel(Facility.name) private readonly facilityModel: Model<Facility>,
    @InjectModel(Chiller.name) private readonly chillerModel: Model<Chiller>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private emailService: EmailService,
  ) {}
  async create(createFacilityDto: CreateFacilityDTO) {
    // const { companyId, name, chillers, ...facilityDetails } = createFacilityDto;
    try {
      const {
        name,
        companyId,
        address1,
        address2,
        city,
        state,
        country,
        zipcode,
        timezone,
        altitude,
        altitudeUnit,
        chillers, // Optional chillers array
      } = createFacilityDto;

      const companyObjectId = new mongoose.Types.ObjectId(companyId);

      // Step 1: Check if the company exists
      const companyExists = await this.companyModel.findById(companyId);
      if (!companyExists) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.COMPANY_NOT_FOUND,
        );
      }

      // Step 2: Check if the facility name is unique within the company
      const existingFacility = await this.facilityModel.findOne({
        companyId: companyObjectId,
        name,
        isDeleted: false,
      });
      if (existingFacility) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.FACILITY_ALREADY_EXISTS,
        );
      }

      // Step 3: Create the facility
      // const createdFacility = await this.facilityModel.create({
      //   companyId,
      //   name,
      //   ...facilityDetails,
      // });
      const createdFacility = await this.facilityModel.create({
        companyId: companyObjectId,
        name,
        address1,
        address2,
        city,
        state,
        country,
        zipcode,
        timezone,
        altitude,
        altitudeUnit,
        facilityCode: Math.floor(100000 + Math.random() * 900000),
      });

      // update the total facilities in the compnay

      // Step 4: Handle chiller creation if provided
      // if (chillers && chillers.length > 0) {
      //   const chillerDocs = chillers.map(
      //     (chiller: CreateChillerWithFacilityDTO) => ({
      //       ...chiller,
      //       facilityId: createdFacility._id,
      //       companyId: companyObjectId,
      //     }),
      //   );

      //   const createdChillers = await this.chillerModel.create(chillerDocs);

      //   const chillerIds: mongoose.Types.ObjectId[] = [];

      //   for (const chiller of createdChillers) {
      //     await chiller.save();
      //     chillerIds.push(chiller._id as mongoose.Types.ObjectId);
      //   }

      //   createdFacility.chillers = chillerIds;
      //   // createdFacility.totalChiller = chillerIds.length;
      //   await createdFacility.save();

      //   // Update total chillers count for the facility
      //   await this.facilityModel.updateOne(
      //     { _id: createdFacility._id },
      //     { $set: { totalChiller: chillerDocs.length } },
      //   );
      // }
      if (chillers && chillers.length > 0) {
        const chillerDocs = chillers.map(
          (chiller: CreateChillerWithFacilityDTO) => {
            // const tonsValue =
            //   typeof chiller.kwr === "number" &&
            //   chiller.unit === MEASUREMENT_UNITS.SIMetric
            //     ? parseFloat((chiller.kwr / 3.51685).toFixed(2))
            //     : chiller.tons;

            // const { name: chillerName, ...rest } = chiller;

            // return {
            //   ...rest,
            //   chillerNo: chillerName, // set chillerNo from name
            //   tons: tonsValue,
            //   facilityId: createdFacility._id,
            //   companyId: companyObjectId,
            //   status: CHILLER_STATUS.Pending,
            // };
            return {
              ChillerNo: chiller.name, // ✅ save name as ChillerNo (case-sensitive)
              unit: chiller.unit,
              weeklyHours: chiller.weeklyHours,
              weeksPerYear: chiller.weeksPerYear,
              avgLoadProfile: chiller.avgLoadProfile,
              make: chiller.make,
              model: chiller.model,
              serialNumber: chiller.serialNumber,
              manufacturedYear: chiller.manufacturedYear,
              refrigType: chiller.refrigType,
              tons: chiller.tons,
              kwr: chiller.kwr,
              energyCost: chiller.energyCost,
              companyId: companyObjectId,
              facilityId: createdFacility._id,
              status: CHILLER_STATUS.Pending,
            };
          },
        );
        console.log("✌️chillerDocs --->", chillerDocs);

        const createdChillers = await this.chillerModel.create(chillerDocs);
        const chillerIds: mongoose.Types.ObjectId[] = [];

        for (const chiller of createdChillers) {
          await chiller.save();
          chillerIds.push(chiller._id as mongoose.Types.ObjectId);
        }

        createdFacility.chillers = chillerIds;
        await createdFacility.save();

        // Update total chillers count for the facility
        await this.facilityModel.updateOne(
          { _id: createdFacility._id },
          { $set: { totalChiller: chillerDocs.length } },
        );
      }

      // Step 5: Update totalChillers in the Company
      const totalChillersForCompany = await this.chillerModel.countDocuments({
        companyId: companyObjectId,
      });
      // console.log('✌️totalChillersForCompany --->', totalChillersForCompany);

      await this.companyModel.updateOne(
        { _id: companyObjectId },
        {
          $set: { totalChiller: totalChillersForCompany },
          $push: { facilities: createdFacility._id },
          $inc: { totalFacilities: 1 },
        },
      );

      return this.facilityModel.findById(createdFacility._id).populate({
        path: "chillers",
        select: "-__v",
      });
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async findAll(req: Request, body: FacilityListDto) {
    try {
      console.log("logged in user", req["user"]);

      const {
        page = 1,
        limit = 10,
        search,
        sort_by,
        sort_order = "desc",
      } = body;

      if (!page || !limit || page <= 0 || limit <= 0) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.INVALID_PAGE_AND_LIMIT_VALUE,
        );
      }
      const findUser = await this.userModel.findOne({
        _id: req["user"]["_id"],
      });
      const matchObj: FilterQuery<FacilityDocument> = { isDeleted: false };

      if (!findUser) {
        throw TypeExceptions.BadRequestCommonFunction(USER.USER_NOT_FOUND);
      }

      if (req["user"]["role"] == Role.CORPORATE_MANAGER) {
        if (findUser.companyId) {
          body.companyId = findUser.companyId.toString();
        } else {
          matchObj._id = {
            $in: [],
          };
        }
      }
      if (
        req["user"]["role"] == Role.FACILITY_MANAGER ||
        req["user"]["role"] == Role.OPERATOR
      ) {
        let facilityIds = [];
        if (findUser.facilityIds && findUser.facilityIds.length) {
          facilityIds = findUser.facilityIds.map(
            (id) => new mongoose.Types.ObjectId(id),
          );
        }
        matchObj._id = {
          $in: facilityIds,
        };
      }

      const companyId = body.companyId;
      const skip = (page - 1) * limit;

      if (companyId) {
        const existingCompany = await this.companyModel.findById(companyId);
        if (!existingCompany) {
          throw TypeExceptions.BadRequestCommonFunction(
            RESPONSE_ERROR.COMPANY_NOT_FOUND,
          );
        }
        matchObj.companyId = new mongoose.Types.ObjectId(companyId);
      }

      const pipeline = [];

      // Step 1: Filter out deleted
      pipeline.push({ $match: matchObj });

      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.COMPANY, // Match the actual MongoDB collection name
          localField: "companyId",
          foreignField: "_id",
          as: "company",
        },
      });

      pipeline.push({
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true,
        },
      });

      // Step 2: Group fields
      pipeline.push(
        {
          $group: {
            _id: "$_id",
            companyName: { $first: "$company.name" },
            company: { $first: "$company" },
            name: { $first: "$name" },
            address: {
              $first: {
                // $concat: [
                //   '$address1',
                //   ', ',
                //   {
                //     $cond: {
                //       if: {
                //         $ne: ['$address2', ''],
                //       },
                //       then: { $concat: ['$address2', ', '] },
                //       else: '',
                //     },
                //   },
                //   '$city',
                //   ', ',
                //   '$state',
                //   ', ',
                //   '$country',
                // ],
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
            timezone: { $first: "$timezone" },
            altitude: { $first: "$altitude" },
            altitudeUnit: { $first: "$altitudeUnit" },
            totalChiller: { $first: "$totalChiller" },
            totalOperators: { $first: "$totalOperators" },
            isActive: { $first: "$isActive" },
            createdAt: { $first: "$createdAt" },
            facilityCode: { $first: "$facilityCode" },
          },
        },
        {
          $addFields: {
            nameLower: { $toLower: "$name" },
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
            timezone: 1,
            altitude: 1,
            altitudeUnit: 1,
            companyName: 1,
            company: 1,
            totalChiller: 1,
            totalOperators: 1,
            isActive: 1,
            createdAt: 1,
            companyId: 1,
            facilityCode: 1,
          },
        },
      );

      // Step 3: Search (post-group, same as company list)
      if (search) {
        const searchConditions = [
          { name: { $regex: search.trim(), $options: "i" } },
          { address: { $regex: search.trim(), $options: "i" } },
          { timezone: { $regex: search.trim(), $options: "i" } },
        ];

        pipeline.push({
          $match: {
            $or: searchConditions,
          },
        });
      }

      // Step 4: Pagination
      pipeline.push({
        $facet: {
          facilityList: [{ $skip: skip }, { $limit: limit }],
          totalRecords: [{ $count: "count" }],
        },
      });

      // Step 5: Execute aggregation
      const result = await this.facilityModel.aggregate(pipeline);

      console.log("✌️result --->", result[0]);
      return {
        ...result[0],
        totalRecords: result[0]?.totalRecords?.[0]?.count || 0,
      };
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async findAllFacilities(req: Request, companyId: string) {
    try {
      const findUser = await this.userModel.findOne({
        _id: req["user"]["_id"],
      });
      if (!findUser) {
        throw TypeExceptions.BadRequestCommonFunction(USER.USER_NOT_FOUND);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filter: any = {};

      if (req["user"]["role"] == Role.CORPORATE_MANAGER) {
        if (findUser.companyId) {
          companyId = findUser.companyId.toString();
        } else {
          filter["_id"] = { $in: [] };
        }
      }
      if (companyId?.trim()) {
        filter.companyId = new mongoose.Types.ObjectId(companyId);
      }

      if (
        req["user"]["role"] == Role.FACILITY_MANAGER ||
        req["user"]["role"] == Role.OPERATOR
      ) {
        let facilityIds = [];
        if (findUser.facilityIds && findUser.facilityIds.length) {
          facilityIds = findUser.facilityIds.map(
            (id) => new mongoose.Types.ObjectId(id),
          );
        }
        filter["_id"] = { $in: facilityIds };
      }

      const facilities = await this.facilityModel
        .find(filter)
        .select("_id name companyId"); // <-- select only needed fields
      console.log("facilities: =======", facilities);
      return facilities;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
  async findOne(id: string) {
    // Step 1: Find the facility by ID
    // const facility = await this.facilityModel
    //   .findById(id)
    //   .where({ isDeleted: false }) // Ensure facility is not deleted
    //   .populate('chillers'); // Populate chillers associated with this facility

    // if (!facility) {
    // throw TypeExceptions.BadRequestCommonFunction(
    //   RESPONSE_ERROR.FACILITY_NOT_FOUND
    // );
    // }

    // // Step 2: Return the facility with populated chillers
    // console.log('✌️facility --->', facility);
    // return facility;
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.INVALID_ID,
        );
      }
      const matchObj = {
        isDeleted: false,
        _id: new mongoose.Types.ObjectId(id),
      };

      const pipeline = [];

      // Step 2: Match the facility by its ID and ensure it's not deleted
      pipeline.push({ $match: matchObj });

      // Step 3: Use $lookup to join chillers from the Chiller collection based on facilityId
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.CHILLER, // Name of the Chiller collection
          localField: "_id", // Facility _id
          foreignField: "facilityId", // Chiller facilityId field
          as: "chillers", // The result of the join will be populated under 'chillers'
        },
      });
      // pipeline.push({
      //   $unwind: {
      //     path: "$chillers",
      //     preserveNullAndEmptyArrays: true, // In case company is missing
      //   },
      // });

      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.COMPANY, // Name of the Chiller collection
          localField: "companyId", // Facility _id
          foreignField: "_id", // Chiller facilityId field
          as: "company", // The result of the join will be populated under 'chillers'
        },
      });

      pipeline.push({
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true, // In case company is missing
        },
      });

      // Step 4: Project the necessary fields for the facility
      pipeline.push({
        $project: {
          name: 1,
          // address: 1,
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
          companyId: 1,
          companyName: "$company.name",
          facilityCode: 1,
          address1: 1,
          address2: 1,
          city: 1,
          state: 1,
          zipcode: 1,
          country: 1,
          timezone: 1,
          altitude: 1,
          altitudeUnit: 1,
          totalChiller: 1,
          totalOperators: 1,
          isActive: 1,
          isDeleted: 1,
          createdAt: 1,
          chillers: 1, // Include chillers in the response
        },
      });

      // Step 5: Execute the aggregation pipeline
      const result = await this.facilityModel.aggregate(pipeline);

      // Step 6: Return the result
      if (result.length) {
        // return result[0]; // Return the first result as the response
        const facility = result[0];
        // facility.chillers = facility.chillers.map((chiller) => {
        //   if (
        //     typeof chiller.tons === "number" &&
        //     typeof chiller.unit === "string" &&
        //     chiller.unit.toLowerCase().includes("si")
        //   ) {
        //     return {
        //       ...chiller,
        //       tons: parseFloat((chiller.tons * 3.51685).toFixed(2)), // return kwr in same field
        //     };
        //   }
        //   return chiller;
        // });

        return facility;
      } else {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.FACILITY_NOT_FOUND,
        );
      }
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  // async update(id: string, body: UpdateFacilityDto) {
  //   try {
  //     const chillers = body.chillers;

  //     // Step 1: Validate facility existence
  //     const existingFacility = await this.facilityModel.findOne({
  //       _id: new mongoose.Types.ObjectId(id),
  //       isDeleted: false,
  //     });

  //     if (!existingFacility) {
  //       throw TypeExceptions.BadRequestCommonFunction(
  //         RESPONSE_ERROR.FACILITY_NOT_FOUND
  //       );
  //     }

  //     // Step 2: Check for duplicate facility name in the same company (excluding current one)
  //     if (body.name) {
  //       const duplicateFacility = await this.facilityModel.findOne({
  //         _id: { $ne: new mongoose.Types.ObjectId(id) },
  //         name: body.name,
  //         companyId: existingFacility.companyId,
  //         isDeleted: false,
  //       });

  //       if (duplicateFacility) {
  //         throw TypeExceptions.BadRequestCommonFunction(
  //           RESPONSE_ERROR.FACILITY_NAME_EXISTS
  //         );
  //       }
  //     }

  //     // Step 3: Update basic facility fields (excluding chillers)
  //     // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //     const { chillers: _, ...facilityFields } = body;

  //     const filteredFields = Object.fromEntries(
  //       Object.entries(facilityFields).filter(
  //         // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //         ([_, value]) => value !== undefined && value !== ''
  //       )
  //     );

  //     await this.facilityModel.updateOne({ _id: id }, { $set: filteredFields });

  //     // Step 4: Handle Chillers (if any in payload)
  //     if (Array.isArray(chillers) && chillers.length > 0) {
  //       const chillerNames = chillers.map((chiller) => chiller.name);

  //       // a. Check for duplicate chiller names in the request
  //       const duplicateNames = chillerNames.filter(
  //         (name, index, self) => self.indexOf(name) !== index
  //       );

  //       if (duplicateNames.length > 0) {
  //         throw TypeExceptions.BadRequestCommonFunction(
  //           RESPONSE_ERROR.DUPLICATE_CHILLER_NAMES_IN_PAYLOAD
  //         );
  //       }

  //       // b. Check if any chillers with same names exist under this facility already
  //       const existingChillers = await this.chillerModel.find({
  //         facilityId: new mongoose.Types.ObjectId(id),
  //         name: { $in: chillerNames },
  //         isDeleted: false,
  //       });

  //       if (existingChillers.length > 0) {
  //         throw TypeExceptions.BadRequestCommonFunction(
  //           RESPONSE_ERROR.DUPLICATE_CHILLER_NAMES_IN_PAYLOAD
  //         );
  //       }

  //       // c. Prepare chiller documents
  //       const chillersToCreate = chillers.map((chiller) => ({
  //         ...chiller,
  //         facilityId: new mongoose.Types.ObjectId(id),
  //         companyId: existingFacility.companyId,
  //       }));

  //       // d. Create and save chillers
  //       const createdChillers =
  //         await this.chillerModel.create(chillersToCreate);
  //       const chillerIds = existingFacility.chillers || [];

  //       for (const chiller of createdChillers) {
  //         await chiller.save();
  //         chillerIds.push(chiller._id);
  //       }

  //       // e. Update chillers array and chiller count in facility
  //       existingFacility.chillers = chillerIds;
  //       existingFacility.totalChiller = chillerIds.length;
  //       await existingFacility.save();
  //     }

  //     // Step 5: Return updated facility with populated chillers (optional)
  //     return await this.facilityModel
  //       .findById(id)
  //       .populate([
  //         { path: 'chillers' },
  //         {
  //           path: 'companyId',
  //           select: 'name', // Fetch only the name field
  //         },
  //       ])
  //       .exec();
  //   } catch (error) {
  //     throw CustomError.UnknownError(error?.message, error?.status);
  //   }
  // }

  async update(id: string, body: UpdateFacilityDto) {
    try {
      const chillers = body.chillers;

      // Step 1: Validate facility existence
      const existingFacility = await this.facilityModel.findOne({
        _id: new mongoose.Types.ObjectId(id),
        isDeleted: false,
      });

      if (!existingFacility) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.FACILITY_NOT_FOUND,
        );
      }

      // Step 2: Check for duplicate facility name in the same company
      if (body.name) {
        const duplicateFacility = await this.facilityModel.findOne({
          _id: { $ne: new mongoose.Types.ObjectId(id) },
          name: body.name,
          companyId: existingFacility.companyId,
          isDeleted: false,
        });

        if (duplicateFacility) {
          throw TypeExceptions.BadRequestCommonFunction(
            RESPONSE_ERROR.FACILITY_NAME_EXISTS,
          );
        }
      }

      // Step 3: Update fields
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { chillers: _, ...facilityFields } = body;
      const filteredFields = Object.fromEntries(
        Object.entries(facilityFields).filter(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ([_, value]) => value !== undefined && value !== "",
        ),
      );

      if (filteredFields.companyId) {
        filteredFields.companyId = new mongoose.Types.ObjectId(
          filteredFields.companyId,
        );
      }

      await this.facilityModel.updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: filteredFields },
      );

      // Step 4: Chillers
      if (Array.isArray(chillers) && chillers.length > 0) {
        const chillerNames = chillers.map((c) => c.name);

        // a. Check duplicates in payload
        const duplicateNames = chillerNames.filter(
          (name, idx, arr) => arr.indexOf(name) !== idx,
        );
        if (duplicateNames.length > 0) {
          throw TypeExceptions.BadRequestCommonFunction(
            RESPONSE_ERROR.DUPLICATE_CHILLER_NAMES_IN_PAYLOAD,
          );
        }

        // b. Check for existing chillers with same name
        const existingChillers = await this.chillerModel.find({
          facilityId: new mongoose.Types.ObjectId(id),
          // name: { $in: chillerNames },
          chillerNo: { $in: chillerNames },
          isDeleted: false,
        });
        if (existingChillers.length > 0) {
          throw TypeExceptions.BadRequestCommonFunction(
            RESPONSE_ERROR.DUPLICATE_CHILLER_NAMES_IN_PAYLOAD,
          );
        }

        // c. Create
        // const chillersToCreate = chillers.map((c) => ({
        //   ...c,
        //   facilityId: new mongoose.Types.ObjectId(id),
        //   companyId: existingFacility.companyId,
        // }));

        const chillersToCreate = chillers.map((c) => {
          // const tonsValue =
          //   typeof c.kwr === 'number' && c.unit === MEASUREMENT_UNITS.SIMetric
          //     ? parseFloat((c.kwr / 3.51685).toFixed(2))
          //     : c.tons;
          // const { name, ...rest } = c;
          // console.log('✌️tonsValue --->', tonsValue);

          // return {
          //   ...rest,
          //   ChillerNo: name,
          //   tons: tonsValue,
          //   facilityId: new mongoose.Types.ObjectId(id),
          //   companyId: existingFacility.companyId,
          // };
          const { name, kwr, unit, ...rest } = c;

          // const tonsValue =
          //   unit === MEASUREMENT_UNITS.SIMetric && typeof kwr === 'number'
          //     ? parseFloat((kwr / 3.51685).toFixed(2))
          //     : tons;
          // let tonsValue: number;

          console.log("✌️unit --->", unit);
          console.log("✌️kwr --->", kwr);
          console.log(
            "✌️MEASUREMENT_UNITS.SIMetric --->",
            MEASUREMENT_UNITS.SIMetric,
          );
          // if (unit === MEASUREMENT_UNITS.SIMetric && typeof kwr === 'number') {
          //   console.log('IIIIIIIIIIIIII');

          //   tonsValue = kwr / 3.51685;
          // } else if (
          //   unit === MEASUREMENT_UNITS.English &&
          //   typeof tons === 'number'
          // ) {
          //   console.log('@@@@@@@@@@@@');

          //   tonsValue = tons;
          // } else {
          //   tonsValue = 0; // fallback to 0 or throw error if needed
          // }
          // console.log('✌️tonsValue --->', tonsValue);

          return {
            ...rest,
            ChillerNo: name,
            unit,
            facilityId: new mongoose.Types.ObjectId(id),
            companyId: existingFacility.companyId,
            status: ChillerStatus.Pending,
          };
        });

        const createdChillers =
          await this.chillerModel.create(chillersToCreate);

        // d. Push to facility
        const chillerIds = existingFacility.chillers || [];
        for (const chiller of createdChillers) {
          await chiller.save();
          await this.companyModel.updateOne(
            { _id: new mongoose.Types.ObjectId(chiller?.companyId) },
            { $inc: { totalChiller: 1 } },
          );

          chillerIds.push(chiller._id);
        }

        existingFacility.chillers = chillerIds;
        existingFacility.totalChiller = chillerIds.length;
        await existingFacility.save();
      }

      // Step 5: Return the updated facility using aggregation
      const pipeline = [
        {
          $match: {
            _id: new mongoose.Types.ObjectId(id),
            isDeleted: false,
          },
        },
        {
          $lookup: {
            from: TABLE_NAMES.CHILLER,
            localField: "_id",
            foreignField: "facilityId",
            as: "chillers",
          },
        },
        {
          $lookup: {
            from: TABLE_NAMES.COMPANY,
            localField: "companyId",
            foreignField: "_id",
            as: "company",
          },
        },
        {
          $unwind: {
            path: "$company",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            name: 1,
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
            companyId: 1,
            companyName: "$company.name",
            company: "$company",
            facilityCode: 1,
            address1: 1,
            address2: 1,
            city: 1,
            state: 1,
            zipCode: 1,
            country: 1,
            timezone: 1,
            altitude: 1,
            altitudeUnit: 1,
            totalChiller: 1,
            totalOperators: 1,
            isActive: 1,
            isDeleted: 1,
            createdAt: 1,
            updatedAt: 1,
            chillers: {
              $map: {
                input: "$chillers",
                as: "ch",
                in: {
                  _id: "$$ch._id",
                  ChillerNo: "$$ch.ChillerNo",
                  unit: "$$ch.unit",
                  weeklyHours: "$$ch.weeklyHours",
                  weeksPerYear: "$$ch.weeksPerYear",
                  avgLoadProfile: "$$ch.avgLoadProfile",
                  make: "$$ch.make",
                  model: "$$ch.model",
                  serialNumber: "$$ch.serialNumber",
                  manufacturedYear: "$$ch.manufacturedYear",
                  refrigType: "$$ch.refrigType",
                  tons: "$$ch.tons",
                  kwr: "$$ch.kwr",
                  // tons: {
                  //   $cond: {
                  //     if: { $eq: ['$$ch.unit', 'SI Metric'] },
                  //     then: {
                  //       $round: [{ $multiply: ['$$ch.tons', 3.51685] }, 2],
                  //     }, // kwr
                  //     else: '$$ch.tons',
                  //   },
                  // },
                  // tons: {
                  //   $cond: {
                  //     if: {
                  //       $regexMatch: {
                  //         input: { $toLower: '$$ch.unit' },
                  //         regex: '^si.*metric$', // matches variations of SI Metric
                  //       },
                  //     },
                  //     then: {
                  //       $round: [{ $multiply: ['$$ch.tons', 3.51685] }, 2], // convert back to kwr
                  //     },
                  //     else: '$$ch.tons',
                  //   },
                  // },

                  // tons: {
                  //   $cond: [
                  //     { $eq: ['$$ch.unit', 'SI Metric'] },
                  //     { $round: [{ $multiply: ['$$ch.tons', 3.51685] }, 2] },
                  //     '$$ch.tons',
                  //   ],
                  // },

                  energyCost: "$$ch.energyCost",
                  status: "$$ch.status",
                  companyId: "$$ch.companyId",
                  facilityId: "$$ch.facilityId",
                  createdAt: "$$ch.createdAt",
                  updatedAt: "$$ch.updatedAt",
                },
              },
            },
          },
        },
      ];

      const result = await this.facilityModel.aggregate(pipeline);
      if (result.length === 0) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.FACILITY_NOT_FOUND,
        );
      }

      // return result[0];
      const facility = result[0];
      // facility.chillers = facility.chillers.map((chiller) => {
      //   if (
      //     typeof chiller.tons === 'number' &&
      //     typeof chiller.unit === 'string' &&
      //     chiller.unit.toLowerCase().includes('si')
      //   ) {
      //     return chiller;
      //     // {
      //     //   ...chiller,
      //     //   tons: parseFloat((chiller.tons * 3.51685).toFixed(2)), // return kwr in same field
      //     // };
      //   }
      //   console.log('✌️chiller --->', chiller);
      //   return chiller;
      // });

      console.log("✌️facility --->", facility);
      return facility;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async updateStatus(facilityId: string, body: UpdateFacilityStatusDto) {
    try {
      const { isActive } = body;

      // Check if facility exists
      const facility = await this.facilityModel.findById(facilityId);
      if (!facility) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.FACILITY_NOT_FOUND,
        );
      }

      // Validate the isActive field (it should be a boolean)
      if (typeof isActive !== "boolean") {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.INVALID_FACILITY_STATUS,
        );
      }

      // Update the isActive field of the facility
      facility.isActive = isActive;

      // If the facility is being deactivated, deactivate all chillers associated with it
      if (!isActive) {
        // Use lookup to find the chillers associated with the facility
        // const chillers = await this.chillerModel.aggregate([
        //   {
        //     $match: { facilityId: new mongoose.Types.ObjectId(facilityId) }, // Match chillers that belong to this facility
        //   },
        // ]);

        // Inactivate the chillers
        if (facility.chillers && facility.chillers.length > 0) {
          await this.chillerModel.updateMany(
            { _id: { $in: facility.chillers } }, // Match the chillers by their IDs
            { $set: { status: ChillerStatus.InActive } }, // Set the isActive status of the chillers to false
          );
        }
      }

      const message = isActive
        ? RESPONSE_SUCCESS.FACILITY_ACTIVATED
        : RESPONSE_SUCCESS.FACILITY_DEACTIVATED;

      await facility.save();

      const allUsers = await this.userModel.find({
        companyId: facility.companyId,
      });

      for (const user of allUsers) {
        const emailHtml = facilityStatusTemplate(
          facility.isActive,
          { firstName: user.firstName },
          facility.name,
        );

        await this.emailService.emailSender({
          to: user.email,
          subject: `Facility Status Update: ${facility.name}`,
          html: emailHtml,
        });
      }

      return message;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async findAllActiveChillers(dto: ActiveFacilities) {
    const companyId = dto.companyId;

    const existingCompany = await this.companyModel.findById(
      new mongoose.Types.ObjectId(companyId),
    );

    if (!existingCompany) {
      throw TypeExceptions.BadRequestCommonFunction(
        RESPONSE_ERROR.COMPANY_NOT_FOUND,
      );
    }

    const activeFacilities = await this.facilityModel.find({
      companyId: existingCompany._id,
      isActive: true,
    });

    if (activeFacilities.length == 0) {
      throw TypeExceptions.BadRequestCommonFunction(
        RESPONSE_ERROR.NO_ACTIVE_FACILITIES,
      );
    }

    return activeFacilities;
  }

  remove(id: number) {
    return `This action removes a #${id} facility`;
  }
}
