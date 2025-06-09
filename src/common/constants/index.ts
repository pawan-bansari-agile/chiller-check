import * as dotenv from "dotenv";
dotenv.config();

export const AUTH_IS_PUBLIC_KEY = "isPublic";

export const STRIPE_KEYS = {
  mode: process.env.STRIPE_MODE,
  test: {
    secret_key: process.env.STRIPE_TEST_SK,
    public_key: process.env.STRIPE_TEST_PK,
  },
  live: {
    secret_key: process.env.STRIPE_LIVE_SK,
    public_key: process.env.STRIPE_LIVE_PK,
  },
};
