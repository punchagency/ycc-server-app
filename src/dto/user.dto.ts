export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: 'admin' | 'user' | 'distributor' | 'manufacturer';
  businessName?: string;
  businessType?: string;
  website?: string;
  taxId?: string;
  license?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

export interface UpdateProfileDto {
  name?: string;
  phone?: string;
  profilePicture?: string;
  address?: {
    street?: string;
    zipcode?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

export interface UserResponseDto {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  profilePicture?: string;
  address?: {
    street?: string;
    zipcode?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponseDto {
  success: boolean;
  message: string;
  data?: {
    token?: string;
    refreshToken?: string;
    user?: UserResponseDto;
  };
}