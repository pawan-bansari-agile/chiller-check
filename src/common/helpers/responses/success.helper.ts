import { HttpStatus } from "@nestjs/common";

export const successResponse = {
  CREATED: {
    message: "Created successfully.",
    statusCode: HttpStatus.CREATED,
  },
  UPDATED: { message: "Updated successfully.", statusCode: HttpStatus.OK },
  DELETED: { message: "Deleted successfully.", statusCode: HttpStatus.OK },
};
