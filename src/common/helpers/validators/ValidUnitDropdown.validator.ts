/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";
import { UNIT_DEPENDENT_OPTIONS } from "src/common/constants/enum.constant";

export function IsValidUnitDropdown(
  unitField: string,
  dropdownType: "commonPressureUnits" | "condPressureUnits",
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "isValidUnitDropdown",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [unitField, dropdownType],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [unitFieldName, dropdownKey] = args.constraints;
          const unit = (args.object as any)[unitFieldName];
          const validValues = UNIT_DEPENDENT_OPTIONS[unit]?.[dropdownKey];
          //   return  validValues.includes(value);
          return Array.isArray(validValues) && validValues.includes(value);
        },
        defaultMessage(args: ValidationArguments) {
          const [unitFieldName, dropdownKey] = args.constraints;
          const unit = (args.object as any)[unitFieldName];
          // const allowed =
          //   UNIT_DEPENDENT_OPTIONS[unit]?.[dropdownKey]?.join(", ");
          const allowedArray = UNIT_DEPENDENT_OPTIONS[unit]?.[dropdownKey];

          //   return `${args.property} must be one of: ${allowed} for unit type ${unit}`;
          // return allowed
          //   ? `${args.property} must be one of: ${allowed.join(", ")} for unit: "${unit}"`
          //   : `Invalid unit "${unit}" provided for ${args.property}`;
          if (Array.isArray(allowedArray)) {
            return `${args.property} must be one of: ${allowedArray.join(", ")} for unit: "${unit}"`;
          } else {
            return `Invalid unit "${unit}" provided for ${args.property}`;
          }
        },
      },
    });
  };
}
