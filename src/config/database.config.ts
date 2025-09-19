// remove
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
    phoneNumber: "+17577050564",
    isActive: true,
  },
  larry: {
    firstName: "Larry",
    lastName: "Seigel",
    email: "lseigel123@gmail.com",
    password: "Admin@123",
    phoneNumber: "+14043079455",
    isActive: true,
  },

  // testUser: {
  //   firstName: "Hardik",
  //   lastName: "QA",
  //   email: "hardik.qa@yopmail.com",
  //   password: "Admin@123",
  //   phoneNumber: "+919824426698",
  //   isActive: true,
  // },
  // sauravUser: {
  //   firstName: "Saurav",
  //   lastName: "FE",
  //   email: "saurav.fe@yopmail.com",
  //   password: "Admin@123",
  //   phoneNumber: "+919824336137",
  //   isActive: true,
  // },
  // Agile: {
  //   firstName: "Agile",
  //   lastName: "Admin",
  //   email: "agileAdmin@yopmail.com",
  //   password: "Admin@123",
  //   phoneNumber: "+917798813105",
  //   isActive: true,
  // },
  mongo: {
    connectionString: process.env.DATABASE_CONNECTION,
  },
}));
