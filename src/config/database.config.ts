import { registerAs } from "@nestjs/config";

export default registerAs("database", () => ({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT || 27017,
  name: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASS,
  initialUser: {
    firstName: "Chiller",
    lastName: "Check",
    email: "chiller.check@yopmail.com",
    password: "Admin@123",
    phoneNumber: "+917798813105",
  },
  larry: {
    firstName: "Larry",
    lastName: "Seigel",
    email: "lseigel123@gmail.com",
    password: "Admin@123",
    phoneNumber: "+14043079455",
  },
  mongo: {
    connectionString: process.env.DATABASE_CONNECTION,
  },
}));
