import { BaseResource } from "./base";

export interface UserInfo {
    cookie_id: string;
    id: number;
    last_activity: string;
    name: string;
    profile: unknown;
    profile_data: UserProfile | null;
    state: Record<string, unknown>;
}

export interface UserProfile {
    avatar: string;
    created_at: string;
    email: string;
    first_name: string;
    id: number;
    last_name: string;
    personal_id_number: string;
    phone_number: string;
    updated_at: string;
    user_id: number;
}

export interface UpdateProfileParams {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    personalIdNumber?: string;
}

export interface SshKey {
    uuid: string;
    name: string;
    public_key: string;
    user_id: number;
    created_at: string;
}

export interface CreateSshKeyParams {
    name: string;
    publicKey: string;
}

export interface RenameSshKeyParams {
    name?: string;
}

/**
 * User profile and SSH key management.
 */
export class UserResource extends BaseResource {
    /** Returns the authenticated user's data. */
    get(): Promise<UserInfo> {
        return this.client.request<UserInfo>("GET", "user-resource/user");
    }

    /** Modifies the authenticated user's profile data. */
    updateProfile(params: UpdateProfileParams = {}): Promise<UserProfile> {
        return this.client.request<UserProfile>("PATCH", "user-resource/user/profile", {
            form: {
                first_name: params.firstName,
                last_name: params.lastName,
                phone_number: params.phoneNumber,
                personal_id_number: params.personalIdNumber,
            },
        });
    }

    /** Lists all SSH public keys of the authenticated user. */
    listSshKeys(): Promise<SshKey[]> {
        return this.client.request<SshKey[]>("GET", "user-resource/ssh_keys");
    }

    /** Creates a new SSH public key. */
    createSshKey(params: CreateSshKeyParams): Promise<SshKey> {
        return this.client.request<SshKey>("POST", "user-resource/ssh_keys", {
            json: { name: params.name, public_key: params.publicKey },
        });
    }

    /** Renames an SSH key. Only the name can be changed. */
    renameSshKey(uuid: string, params: RenameSshKeyParams = {}): Promise<SshKey> {
        return this.client.request<SshKey>("PATCH", `user-resource/ssh_keys/${uuid}`, {
            json: { name: params.name },
        });
    }

    /** Deletes an SSH key by UUID. */
    deleteSshKey(uuid: string): Promise<undefined> {
        return this.client.request<undefined>("DELETE", `user-resource/ssh_keys/${uuid}`);
    }
}
