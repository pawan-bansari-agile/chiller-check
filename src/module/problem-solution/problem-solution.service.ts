import { Injectable } from "@nestjs/common";
import {
  ProblemSolutionListDto,
  UpdateProblemSolutionDto,
} from "./dto/create-problem-solution.dto";
import { InjectModel } from "@nestjs/mongoose";
import { ProblemAndSolutions } from "src/common/schema/problemAndSolutions.schema";
import mongoose, { Model } from "mongoose";
import { CustomError, TypeExceptions } from "src/common/helpers/exceptions";
import { RESPONSE_ERROR } from "src/common/constants/response.constant";
import { User } from "src/common/schema/user.schema";

@Injectable()
export class ProblemSolutionService {
  constructor(
    @InjectModel(ProblemAndSolutions.name)
    private readonly problemSolutionModel: Model<ProblemAndSolutions>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async findAll(req: Request, body: ProblemSolutionListDto) {
    try {
      const loggedInUserId = req["user"]["_id"];
      console.log("✌️loggedInUserId --->", loggedInUserId);
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
      const pipeline = [];
      const skip = (page - 1) * limit;

      // Step 1: Filter out deleted
      //  pipeline.push({ $match: matchObj });

      // Step 2: Group fields
      pipeline.push(
        {
          $group: {
            _id: "$_id",
            section: { $first: "$section" },
            field: { $first: "$field" },
            problem: { $first: "$problem" },
            solution: { $first: "$solution" },
            isActive: { $first: "$isActive" },
            createdAt: { $first: "$createdAt" },
            updatedAt: { $first: "$updatedAt" },
            updated_by: { $first: "$updated_by" },
            updated_by_profile: { $first: "$updated_by_profile" },
          },
        },
        // {
        //   $lookup: {
        //     from: 'users',
        //     localField: 'updated_by',
        //     foreignField: '_id',
        //     as: 'updatedUser',
        //   },
        // },
        // {
        //   $addFields: {
        //     updated_by_profile: {
        //       $arrayElemAt: ['$updatedUser.profileImage', 0],
        //     },
        //   },
        // },
        {
          $addFields: {
            nameLower: { $toLower: "$name" },
          },
        },
      );

      const sortField = sort_by || "updatedAt";
      const sortOrder = sort_order?.toUpperCase() === "ASC" ? 1 : -1;

      pipeline.push({
        $sort: { [sortField]: sortOrder },
      });

      pipeline.push(
        // {
        //   $sort: {
        //     [sort_by === "section" ? "section" : sort_by || "createdAt"]:
        //       sort_order === "ASC" ? 1 : -1,
        //   },
        // },
        {
          $project: {
            section: 1,
            field: 1,
            problem: 1,
            solution: 1,
            createdAt: 1,
            updatedAt: 1,
            totalChiller: 1,
            totalOperators: 1,
            updated_by: 1,
            updated_by_profile: 1,
          },
        },
      );

      // Step 3: Search (post-group, same as company list)
      if (search) {
        const searchConditions = [
          { section: { $regex: search.trim(), $options: "i" } },
          { field: { $regex: search.trim(), $options: "i" } },
          { problem: { $regex: search.trim(), $options: "i" } },
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
          problemSolutionList: [{ $skip: skip }, { $limit: limit }],
          totalRecords: [{ $count: "count" }],
        },
      });

      // Step 5: Execute aggregation
      const result = await this.problemSolutionModel.aggregate(pipeline);
      console.log("✌️result --->", result[0].problemSolutionList[0]);
      return {
        ...result[0],
        totalRecords: result[0]?.totalRecords?.[0]?.count || 0,
      };
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async findOne(id: string) {
    // console.log("✌️id --->", id);
    const result = await this.problemSolutionModel.findById({
      _id: new mongoose.Types.ObjectId(id),
    });
    // console.log("✌️result --->", result);
    if (!result) {
      throw TypeExceptions.NotFoundCommonFunction(
        "Problem & Solution not found!",
      );
    }
    return result;
  }

  async update(req: Request, id: string, body: UpdateProblemSolutionDto) {
    const result = await this.problemSolutionModel.findById({
      _id: new mongoose.Types.ObjectId(id),
    });
    if (!result) {
      throw TypeExceptions.NotFoundCommonFunction(
        "Problem & Solution not found!",
      );
    }
    const user = await this.userModel.findOne({ _id: req["user"]["_id"] });
    console.log("✌️user --->", user);
    await this.problemSolutionModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
      },
      {
        problem: body.problem,
        solution: body.solution,
        updated_by: user.firstName + " " + user.lastName,
        updated_by_profile: user.profileImage,
      },
    );
  }
  async createInitialPS() {
    try {
      const psData = await this.problemSolutionModel.find();
      if (psData && psData.length) {
        return false;
      }
      const psArray = [
        {
          section: "General",
          field: "Outside Air Temp",
          problem: "",
          solution: "",
        },
        {
          section: "General",
          field: "Reading Date Time",
          problem: "",
          solution: "",
        },
        {
          section: "General",
          field: "Chiller run hours",
          problem: "",
          solution: "",
        },
        {
          section: "General",
          field: "Begin recording run hours",
          problem: "",
          solution: "",
        },

        {
          section: "Calculated",
          field: "Efficiency Loss %",
          problem: "",
          solution: "",
        },
        {
          section: "Calculated",
          field: "Cond. App. Loss %",
          problem: "",
          solution: "",
        },
        {
          section: "Calculated",
          field: "Evap. App. Loss %",
          problem: "",
          solution: "",
        },
        {
          section: "Calculated",
          field: "Non-Cond. Loss %",
          problem: "",
          solution: "",
        },
        {
          section: "Calculated",
          field: "Other Losses %",
          problem: "",
          solution: "",
        },
        {
          section: "Calculated",
          field: "Cond. Inlet Loss %",
          problem: "",
          solution: "",
        },
        {
          section: "Calculated",
          field: "Cond Approach",
          problem: "",
          solution: "",
        },
        {
          section: "Calculated",
          field: "Evap. Temp. Loss %",
          problem: "",
          solution: "",
        },
        {
          section: "Calculated",
          field: "Evap. App Variance",
          problem: "",
          solution: "",
        },
        {
          section: "Calculated",
          field: "Evap. Approach",
          problem: "",
          solution: "",
        },
        {
          section: "Calculated",
          field: "Delta Loss %",
          problem: "",
          solution: "",
        },
        {
          section: "Calculated",
          field: "Actual Load",
          problem: "",
          solution: "",
        },
        {
          section: "Calculated",
          field: "CalculatedCondRefrigTemp",
          problem: "",
          solution: "",
        },
        {
          section: "Calculated",
          field: "CalculatedEvapRefrigTemp",
          problem: "",
          solution: "",
        },
        { section: "Calculated", field: "KWHLoss", problem: "", solution: "" },
        { section: "Calculated", field: "BTULoss", problem: "", solution: "" },
        { section: "Calculated", field: "CO2", problem: "", solution: "" },
        {
          section: "Calculated",
          field: "Amp Imbalance",
          problem: "",
          solution: "",
        },
        {
          section: "Calculated",
          field: "Volt Imbalance",
          problem: "",
          solution: "",
        },

        {
          section: "Condenser",
          field: "Inlet Temperature",
          problem: "",
          solution: "",
        },
        {
          section: "Condenser",
          field: "Outlet Temperature",
          problem: "",
          solution: "",
        },
        {
          section: "Condenser",
          field: "Refrig Temp.",
          problem: "",
          solution: "",
        },
        {
          section: "Condenser",
          field: "Excess Approach",
          problem: "",
          solution: "",
        },
        { section: "Condenser", field: "Pressure", problem: "", solution: "" },
        {
          section: "Condenser",
          field: "Non Cond.",
          problem: "",
          solution: "",
        },
        {
          section: "Condenser",
          field: "Pressure Drop",
          problem: "",
          solution: "",
        },

        {
          section: "Evaporator",
          field: "Inlet Temperature",
          problem: "",
          solution: "",
        },
        {
          section: "Evaporator",
          field: "Outlet Temperature",
          problem: "",
          solution: "",
        },
        {
          section: "Evaporator",
          field: "Sat. Refrig Temp.",
          problem: "",
          solution: "",
        },
        {
          section: "Evaporator",
          field: "Excess Approach",
          problem: "",
          solution: "",
        },
        {
          section: "Evaporator",
          field: "Pressure",
          problem: "",
          solution: "",
        },
        {
          section: "Evaporator",
          field: "Pressure Drop",
          problem: "",
          solution: "",
        },

        {
          section: "Compressor",
          field: "Oil Pressure Dif",
          problem: "",
          solution: "",
        },
        {
          section: "Compressor",
          field: "Oil Pressure High",
          problem: "",
          solution: "",
        },
        {
          section: "Compressor",
          field: "Oil Pressure Low",
          problem: "",
          solution: "",
        },
        {
          section: "Compressor",
          field: "Sump Temp",
          problem: "",
          solution: "",
        },
        {
          section: "Compressor",
          field: "Oil Level",
          problem: "",
          solution: "",
        },
        {
          section: "Compressor",
          field: "Bearing Temp",
          problem: "",
          solution: "",
        },
        {
          section: "Compressor",
          field: "Comp 1 Run Hours",
          problem: "",
          solution: "",
        },
        {
          section: "Compressor",
          field: "Begin Record Reading",
          problem: "",
          solution: "",
        },
        {
          section: "Compressor",
          field: "Comp 2 Run Hours",
          problem: "",
          solution: "",
        },
        {
          section: "Compressor",
          field: "Begin Record Reading",
          problem: "",
          solution: "",
        },
        {
          section: "Compressor",
          field: "Purge Time",
          problem: "",
          solution: "",
        },

        { section: "Electrical", field: "Load %", problem: "", solution: "" },
        {
          section: "Electrical",
          field: "Amps Phase 1",
          problem: "",
          solution: "",
        },
        {
          section: "Electrical",
          field: "Amps Phase 2",
          problem: "",
          solution: "",
        },
        {
          section: "Electrical",
          field: "Amps Phase 3",
          problem: "",
          solution: "",
        },
        {
          section: "Electrical",
          field: "Volts Phase 1",
          problem: "",
          solution: "",
        },
        {
          section: "Electrical",
          field: "Volts Phase 2",
          problem: "",
          solution: "",
        },
        {
          section: "Electrical",
          field: "Volts Phase 3",
          problem: "",
          solutions: "",
        },
      ];
      // console.log("-0-0-0-0-0-0-0-0");

      await this.problemSolutionModel.insertMany(psArray);

      return true;
    } catch (error) {
      // console.log("✌️error --->", error);
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
}
