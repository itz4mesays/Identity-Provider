import { GenderTypes, IdentificationType, MaritalStatus, Options, UserRoles } from "@prisma/client";

export type ResponseObject = {
    error: boolean;
    message: string;
    data?: object;  // Optional property
    result?: object;  // Optional property
    pagination?: object
}

export type ErrorResponse = {
    status: 'error';
    message: string;
    details?: any; // Optional details about the error
};

export type PaginatedResult = {
    total: number,
    current: number,
    from: number
    to: number
    pages: number
}

export type ProfileObj = {
    id: number
    email: string
    role: string
    created_at: string
}

export type User = {
    id?: string;
    email?: string;
    role?: string;
}

export type IndividualPayload = {
    tax_id: string
    tax_pay_type: IdentificationType
    identification_value: string
    date_of_birth: string | undefined
}

export type CompleteSignUpPayload = {
    tax_id: string;               // 8 or 10 characters
    verification_code: string;               // 8 or 10 characters
    firstname: string;            // max 155 chars
    surname: string;              // max 155 chars
    othernames?: string | null;   // optional, max 155 chars
    gender: GenderTypes;
    marital_status: MaritalStatus;
    email_address: string;        // unique
    phone_number: string;         // unique
    date_of_birth?: Date | null;
    kaadi_igbeayo_no: string;
    is_public_servant: Options;
    nationality: string;          // max 100 chars
    occupation: string;           // max 155 chars
    state_of_origin: string;      // max 100 chars
    lga_of_origin: string;        // max 100 chars
    business_type: string;        // max 255 chars
    tax_lga_area: string;
    tax_station: string;
}


export interface SamlResponse {
    user: User;
    // Add other SAML response fields as needed
}