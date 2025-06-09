import { User } from "../schema/user.schema";
import { MockModel } from "./mock.model";

export class UserModel extends MockModel<User> {
  protected entityStub: User;
}
