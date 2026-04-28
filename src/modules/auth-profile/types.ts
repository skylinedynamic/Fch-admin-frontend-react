export type UpdatePasswordData = {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
}

export type UpdateProfileData = {
    first_name: string;
    last_name: string;
    phone_number?: string;
    email: string;
    image?: string;
}

export type AuthProfileResponse = {
    status: boolean;
    message: string;
    data?: any;
}
