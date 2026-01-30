export type UpdatePasswordData = {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
}

export type AuthProfileResponse = {
    status: boolean;
    message: string;
    data?: any;
}
