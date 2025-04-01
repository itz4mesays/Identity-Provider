import bcrypt from 'bcrypt'
import { getUserByTaxId } from "./account.service";

export const authenticateUser = async (taxid: string, password: string) => {
    const user = await getUserByTaxId(taxid);
    if (!user) return null;

    // Compare the provided password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, user.password);
    return passwordMatch ? user : null;
}
