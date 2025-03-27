import { PrismaClient } from "@prisma/client";
import envVars from "../validations/validateEnv";

const prisma: PrismaClient = new PrismaClient();

export default prisma;
