import { invoke } from "@tauri-apps/api/core";

export interface LicenseData {
    valid: boolean;
    plan: "Trial" | "Pro" | "Lifetime";
    expiration: string | null; // ISO Date
    createdAt?: string | null;  // ISO Date
    error?: string;
}

export async function computeLegacyCustomerId(data: { name: string, cpf: string, birthDate: string, hardwareId?: string }): Promise<string> {
    if (!data.name || !data.cpf || !data.birthDate) return "IDENTIDADE_NAO_PREENCHIDA";

    // Normalize data (lowercase name, numbers-only CPF)
    const normalizedName = data.name.trim().toLowerCase();
    const normalizedCpf = data.cpf.replace(/\D/g, '');
    const normalizedDob = data.birthDate.trim();
    const hwid = data.hardwareId || "NO_HWID";

    const raw = `TLP-ID-${normalizedName}-${normalizedCpf}-${normalizedDob}-${hwid}`;

    const msgUint8 = new TextEncoder().encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    return hashHex.slice(0, 12);
}

export async function computeDeviceIdentity(hardwareId: string | undefined): Promise<string> {
    const hwid = hardwareId || "NO_HWID";
    
    // Simpler hash based only on the hardware ID for modern licensing
    const raw = `TLP-HWID-${hwid}`;

    const msgUint8 = new TextEncoder().encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    return hashHex.slice(0, 12);
}

export async function validateLicenseKey(key: string, expectedCustomerId?: string): Promise<LicenseData> {
    try {
        console.log("[License] Delegating validation to Rust backend...");

        // Use the new Rust command for security (HMAC with secret hidden in binary)
        const result: any = await invoke("validate_license_cmd", {
            key: key.trim(),
            expectedCid: expectedCustomerId || ""
        });

        if (!result.valid) {
            return {
                valid: false,
                plan: result.plan || "Trial",
                expiration: result.expiration,
                error: result.error || "Licença inválida."
            };
        }

        return {
            valid: true,
            plan: result.plan as any,
            expiration: result.expiration,
        };

    } catch (e) {
        console.error("License Validation Error:", e);
        return { valid: false, plan: "Trial", expiration: null, error: "Erro de comunicação com o sistema de segurança." };
    }
}
