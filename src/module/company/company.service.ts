import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";
import { RESPONSE_ERROR } from "src/common/constants/response.constant";
import { CreateCompanyDto, UpdateCompanyDto } from "src/common/dto/common.dto";
import { TypeExceptions } from "src/common/helpers/exceptions";
import { Company, CompanyDocument } from "src/common/schema/company.schema";
import { Facility, FacilityDocument } from "src/common/schema/facility.schema";

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    @InjectModel(Facility.name)
    private readonly facilityModel: Model<FacilityDocument>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto) {
    // Step 1: Check if the company with the same name already exists
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
  }

  findAll() {
    return `This action returns all company`;
  }

  findOne(id: number) {
    return `This action returns a #${id} company`;
  }

  update(id: number, updateCompanyDto: UpdateCompanyDto) {
    console.log("✌️updateCompanyDto --->", updateCompanyDto);
    return `This action updates a #${id} company`;
  }

  remove(id: number) {
    return `This action removes a #${id} company`;
  }
}
