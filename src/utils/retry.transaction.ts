import { PrismaClient } from "@prisma/client";
import prisma from "./client";
export const retryTransaction = async (fn: (tx: PrismaClient) => Promise<any>, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Pass tx into the transaction function
            return await prisma.$transaction(async (tx : any) => {
                return await fn(tx);  // Call the passed function with tx
            });
        } catch (error) {
            if (attempt === retries) throw error;  // Throw error after final attempt
            console.log(`Retrying transaction... Attempt ${attempt}`);
        }
    }
};
