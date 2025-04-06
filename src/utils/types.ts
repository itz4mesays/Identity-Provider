import { IdentificationType, UserRoles } from "@prisma/client";

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
    email_address: string
    role: string
    tax_pay_type: IdentificationType
    identification_value: string
    date_of_birth: string | undefined
    password: string
}

export interface SamlResponse {
    user: User;
    // Add other SAML response fields as needed
}