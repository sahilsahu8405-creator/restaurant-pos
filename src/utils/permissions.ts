import { RoleType } from '../types';

export interface RolePermissions {
  role: RoleType;
  roleDisplayName: string;
  canEditRestaurantProfile: boolean;
  canEditLegalAndFinancials: boolean; // legal name, GSTIN, currency, timezone
  canEditBranchProfile: boolean;
  canEditBranchOperatingHours: boolean;
  canEditBranchContact: boolean;
  canManageBranches: boolean;
  canEditTaxesAndInvoicing: boolean;
}

export function getRolePermissions(role: RoleType): RolePermissions {
  switch (role) {
    case 'owner':
      return {
        role: 'owner',
        roleDisplayName: 'Restaurant Owner',
        canEditRestaurantProfile: true,
        canEditLegalAndFinancials: true,
        canEditBranchProfile: true,
        canEditBranchOperatingHours: true,
        canEditBranchContact: true,
        canManageBranches: true,
        canEditTaxesAndInvoicing: true,
      };

    case 'manager':
      return {
        role: 'manager',
        roleDisplayName: 'Branch Manager',
        canEditRestaurantProfile: false, // Managers cannot edit organization-wide brand or legal details
        canEditLegalAndFinancials: false,
        canEditBranchProfile: true, // Managers CAN edit branch contact, hours & address
        canEditBranchOperatingHours: true,
        canEditBranchContact: true,
        canManageBranches: false,
        canEditTaxesAndInvoicing: false,
      };

    case 'cashier':
      return {
        role: 'cashier',
        roleDisplayName: 'Cashier',
        canEditRestaurantProfile: false,
        canEditLegalAndFinancials: false,
        canEditBranchProfile: false,
        canEditBranchOperatingHours: false,
        canEditBranchContact: false,
        canManageBranches: false,
        canEditTaxesAndInvoicing: false,
      };

    case 'waiter':
      return {
        role: 'waiter',
        roleDisplayName: 'Waiter',
        canEditRestaurantProfile: false,
        canEditLegalAndFinancials: false,
        canEditBranchProfile: false,
        canEditBranchOperatingHours: false,
        canEditBranchContact: false,
        canManageBranches: false,
        canEditTaxesAndInvoicing: false,
      };

    case 'kitchen':
      return {
        role: 'kitchen',
        roleDisplayName: 'Kitchen Staff',
        canEditRestaurantProfile: false,
        canEditLegalAndFinancials: false,
        canEditBranchProfile: false,
        canEditBranchOperatingHours: false,
        canEditBranchContact: false,
        canManageBranches: false,
        canEditTaxesAndInvoicing: false,
      };

    case 'superadmin':
      // Platform super admin remains separate from restaurant tenant configuration
      return {
        role: 'superadmin',
        roleDisplayName: 'Platform Super Admin',
        canEditRestaurantProfile: false,
        canEditLegalAndFinancials: false,
        canEditBranchProfile: false,
        canEditBranchOperatingHours: false,
        canEditBranchContact: false,
        canManageBranches: false,
        canEditTaxesAndInvoicing: false,
      };

    default:
      return {
        role,
        roleDisplayName: role,
        canEditRestaurantProfile: false,
        canEditLegalAndFinancials: false,
        canEditBranchProfile: false,
        canEditBranchOperatingHours: false,
        canEditBranchContact: false,
        canManageBranches: false,
        canEditTaxesAndInvoicing: false,
      };
  }
}

// Indian GSTIN Validation: 15-character alphanumeric (2 digits state code + 10 PAN chars + 1 entity num + 'Z' + 1 checksum)
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Indian FSSAI License: 14 numeric digits
export const FSSAI_REGEX = /^[0-9]{14}$/;

// Phone number: optional leading +, 8 to 15 digits/spaces/dashes
export const PHONE_REGEX = /^\+?[0-9\s-]{8,15}$/;

// Email regex
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidationErrors {
  [key: string]: string;
}

export function validateRestaurantData(data: {
  name: string;
  legalName?: string;
  primaryPhone?: string;
  businessEmail?: string;
  gstin?: string;
  fssaiLicense?: string;
  operatingHours?: string;
  timezone?: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Restaurant brand name is required (minimum 2 characters)';
  }

  if (data.businessEmail && data.businessEmail.trim() !== '') {
    if (!EMAIL_REGEX.test(data.businessEmail.trim())) {
      errors.businessEmail = 'Please enter a valid email address (e.g. contact@restaurant.com)';
    }
  }

  if (data.primaryPhone && data.primaryPhone.trim() !== '') {
    if (!PHONE_REGEX.test(data.primaryPhone.trim())) {
      errors.primaryPhone = 'Please enter a valid phone number (e.g. +91 98765 43210)';
    }
  }

  if (data.gstin && data.gstin.trim() !== '') {
    const cleanGst = data.gstin.trim().toUpperCase();
    if (!GSTIN_REGEX.test(cleanGst)) {
      errors.gstin = 'Invalid GSTIN format. Expected 15 characters (e.g. 29ABCDE1234F1Z5)';
    }
  }

  if (data.fssaiLicense && data.fssaiLicense.trim() !== '') {
    const cleanFssai = data.fssaiLicense.trim();
    if (!FSSAI_REGEX.test(cleanFssai)) {
      errors.fssaiLicense = 'FSSAI License must be exactly 14 numeric digits';
    }
  }

  return errors;
}

export function validateBranchData(data: {
  name: string;
  code: string;
  phone?: string;
  email?: string;
  gstin?: string;
  fssaiLicense?: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.branchName = 'Branch display name is required';
  }

  if (!data.code || data.code.trim().length < 1) {
    errors.branchCode = 'Branch short code is required (e.g. IND-01)';
  }

  if (data.email && data.email.trim() !== '') {
    if (!EMAIL_REGEX.test(data.email.trim())) {
      errors.branchEmail = 'Please enter a valid branch email address';
    }
  }

  if (data.phone && data.phone.trim() !== '') {
    if (!PHONE_REGEX.test(data.phone.trim())) {
      errors.branchPhone = 'Please enter a valid branch phone number';
    }
  }

  if (data.gstin && data.gstin.trim() !== '') {
    const cleanGst = data.gstin.trim().toUpperCase();
    if (!GSTIN_REGEX.test(cleanGst)) {
      errors.branchGstin = 'Invalid Branch GSTIN format (15 characters)';
    }
  }

  if (data.fssaiLicense && data.fssaiLicense.trim() !== '') {
    const cleanFssai = data.fssaiLicense.trim();
    if (!FSSAI_REGEX.test(cleanFssai)) {
      errors.branchFssai = 'Branch FSSAI must be 14 digits';
    }
  }

  return errors;
}
