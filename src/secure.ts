
export class tSecureString {
    static async generateKey(password: string, salt: string): Promise<CryptoKey> {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
          "raw",
          enc.encode(password),
          { name: "PBKDF2" },
          false,
          ["deriveKey"]
        );
      
        // Derive a key from the password
        return window.crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: enc.encode(salt), // Consider using a secure random salt and storing it separately
            iterations: 100000,
            hash: "SHA-256",
          },
          keyMaterial,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"]
        );
      }
      
    static async encrypt(text: string, password: string, salt: string): Promise<string> {
        const key = await tSecureString.generateKey(password, salt);
        const iv = window.crypto.getRandomValues(new Uint8Array(12)); // AES-GCM needs a 12-byte IV
        const encodedText = new TextEncoder().encode(text);
      
        const encrypted = await window.crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          key,
          encodedText
        );
      
        // Concatenate IV and encrypted data and encode as base64 for easy storage
        const ivAndEncrypted = new Uint8Array([...iv, ...new Uint8Array(encrypted)]);
        return btoa(String.fromCharCode(...ivAndEncrypted));
      }
      
    static async decrypt(cipherText: string, password: string, salt: string): Promise<string | null> {
        const key = await tSecureString.generateKey(password, salt);
        const ivAndEncrypted = new Uint8Array(atob(cipherText).split("").map(c => c.charCodeAt(0)));
      
        // Extract IV and encrypted text
        const iv = ivAndEncrypted.slice(0, 12);
        const encrypted = ivAndEncrypted.slice(12);
      
        try {
          const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            encrypted
          );
      
          return new TextDecoder().decode(decrypted);
        } catch (error) {
          // If decryption fails, return null
          console.log(error);
          return null;
        }
      }
}