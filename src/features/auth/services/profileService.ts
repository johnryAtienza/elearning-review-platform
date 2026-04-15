/**
 * Profile service — reads and writes the `profiles` table.
 * Password changes go through Supabase Auth directly.
 */
import { supabase } from '@/services/supabaseClient'

export interface ProfileUpdateData {
  firstName: string
  lastName: string
  mobileNumber: string
}

/** Fetch the current user's profile row. */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('first_name, last_name, mobile_number, email, created_at')
    .eq('id', userId)
    .single()

  if (error) throw new Error(error.message)
  return data as {
    first_name:    string | null
    last_name:     string | null
    mobile_number: string | null
    email:         string | null
    created_at:    string
  }
}

/**
 * Update first name, last name, and mobile number.
 * Writes to both the `profiles` table and auth user_metadata so the
 * two stay in sync and the navbar reflects the new name immediately.
 */
export async function updateProfile(userId: string, data: ProfileUpdateData): Promise<void> {
  const name = `${data.firstName} ${data.lastName}`.trim()

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      name,
      first_name:    data.firstName,
      last_name:     data.lastName,
      mobile_number: data.mobileNumber,
    })
    .eq('id', userId)

  if (profileError) throw new Error(profileError.message)

  // Keep auth metadata in sync so getSession() returns updated values
  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      name,
      first_name:    data.firstName,
      last_name:     data.lastName,
      mobile_number: data.mobileNumber,
    },
  })

  if (metaError) throw new Error(metaError.message)
}

/**
 * Change the current user's password.
 * The user must already have a valid session (no "current password" required
 * because Supabase Auth trusts the active session as proof of identity).
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}
