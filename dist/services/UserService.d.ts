import { User } from '../types';
export declare class UserService {
    private static readonly SALT_ROUNDS;
    static hashPassword(password: string): Promise<string>;
    static verifyPassword(password: string, hash: string): Promise<boolean>;
    static createUser(userData: Omit<User, 'id' | 'createdAt' | 'passwordHash'> & {
        password: string;
    }): Promise<User>;
    static findUserByUsername(username: string): Promise<User | null>;
    static authenticateUser(username: string, password: string): Promise<User | null>;
    static findUserById(id: number): Promise<User | null>;
    static updateLastLogin(id: number): Promise<void>;
    static createDefaultAdminUser(): Promise<User>;
    static getDefaultAdminUser(): Promise<User>;
    private static mapRowToUser;
}
//# sourceMappingURL=UserService.d.ts.map