import { GenderTypes, MaritalStatus, UserRoles } from "@prisma/client";
import { encrypt } from "./crypto";
import { CompleteSignUpPayload, IndividualPayload } from "./types";

export const buildInitialRegData = (
    data: IndividualPayload,
    password: string,
    verification: string,
    role: UserRoles
) => {

    return {
        tax_id: data.tax_id,
        password: password,
        verification_code: verification,
        date_of_birth: data.date_of_birth,
        identification_type: data.tax_pay_type,
        identification_value: encrypt(data.identification_value), //Encrypt bvn or nin for security purpose
        role
    }
}

export const buildCompleteSignupData = (data: CompleteSignUpPayload) => {
    return {
        tax_id: data.tax_id,
        firstname: data.firstname,
        surname: data.surname,
        othernames: data.othernames,
        gender: data.gender as GenderTypes,
        marital_status: data.marital_status as MaritalStatus,
        email_address: data.email_address,
        phone_number: data.phone_number,
        date_of_birth: data.date_of_birth,
        kaadi_igbeayo_no: data.kaadi_igbeayo_no,
        is_public_servant: data.is_public_servant,
        nationality: data.nationality,
        occupation: data.occupation,
        state_of_origin: data.state_of_origin,
        lga_of_origin: data.lga_of_origin,
        business_type: data.business_type,
        tax_lga_area: data.tax_lga_area,
        tax_station: data.tax_station,
    }
}