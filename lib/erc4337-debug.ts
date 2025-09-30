/**
 * ERC-4337 Account Abstraction Debugging Utilities
 * Helps diagnose signature validation and paymaster issues
 */


export interface ERC4337Config {
    paymasterUrl: string | undefined;
    bundlerUrl: string | undefined;
    apiKey: string | undefined;
    chainId: number;
}

export interface ERC4337ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    config: ERC4337Config;
}

/**
 * Comprehensive ERC-4337 configuration validation
 */
export function validateERC4337Config(chainId: number = 84532): ERC4337ValidationResult {
    const config: ERC4337Config = {
        paymasterUrl: process.env.NEXT_PUBLIC_PAYMASTER_URL,
        bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL,
        apiKey: process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY,
        chainId
    };

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required environment variables
    if (!config.paymasterUrl) {
        errors.push('NEXT_PUBLIC_PAYMASTER_URL is not configured');
    } else {
        // Validate paymaster URL format
        if (!config.paymasterUrl.includes('api.developer.coinbase.com')) {
            errors.push('Paymaster URL must be from Coinbase Developer Platform');
        }
        if (!config.paymasterUrl.includes('/rpc/v1/')) {
            warnings.push('Paymaster URL should include /rpc/v1/ path');
        }
    }

    if (!config.bundlerUrl) {
        errors.push('NEXT_PUBLIC_BUNDLER_URL is not configured');
    } else {
        // Validate bundler URL format
        if (!config.bundlerUrl.includes('api.developer.coinbase.com')) {
            errors.push('Bundler URL must be from Coinbase Developer Platform');
        }
        if (config.bundlerUrl !== config.paymasterUrl) {
            warnings.push('Bundler and Paymaster URLs are different - ensure both are correctly configured');
        }
    }

    if (!config.apiKey) {
        errors.push('NEXT_PUBLIC_ONCHAINKIT_API_KEY is not configured');
    } else {
        if (config.apiKey.length < 32) {
            warnings.push('API key seems too short - verify it\'s correct');
        }
    }

    // Chain-specific validation
    if (chainId === 84532) { // Base Sepolia
        if (config.paymasterUrl && !config.paymasterUrl.includes('base-sepolia')) {
            warnings.push('Using Base Sepolia but paymaster URL doesn\'t specify base-sepolia');
        }
    } else if (chainId === 8453) { // Base Mainnet
        if (config.paymasterUrl && !config.paymasterUrl.includes('base/')) {
            warnings.push('Using Base Mainnet but paymaster URL doesn\'t specify base');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        config
    };
}

/**
 * Debug signature validation failures
 */
export function debugSignatureValidation(error: Error | unknown): {
    isSignatureError: boolean;
    possibleCauses: string[];
    recommendations: string[];
} {
    const errorMessage = error?.message || error?.toString() || '';
    const isSignatureError = errorMessage.includes('SignatureValidationFailed') ||
        errorMessage.includes('signature') ||
        errorMessage.includes('aggregator');

    const possibleCauses: string[] = [];
    const recommendations: string[] = [];

    if (isSignatureError) {
        possibleCauses.push(
            'Paymaster signature is invalid or expired',
            'Bundler configuration mismatch',
            'User operation parameters don\'t match signed data',
            'Smart contract wallet is not properly configured',
            'EntryPoint contract validation failed'
        );

        recommendations.push(
            'Verify NEXT_PUBLIC_PAYMASTER_URL and NEXT_PUBLIC_BUNDLER_URL are correct',
            'Check that your Coinbase Developer Platform project is active',
            'Ensure your contracts are allowlisted on the paymaster',
            'Try reducing the batch size to test with fewer transactions',
            'Check that you\'re using the correct chain ID (Base Sepolia: 84532)',
            'Verify your OnchainKit API key is valid and has proper permissions'
        );
    }

    return {
        isSignatureError,
        possibleCauses,
        recommendations
    };
}

/**
 * Generate ERC-4337 debug report
 */
export function generateERC4337DebugReport(chainId: number = 84532, error?: Error | unknown): string {
    const validation = validateERC4337Config(chainId);
    const signatureDebug = error ? debugSignatureValidation(error) : null;

    let report = '🔍 ERC-4337 DEBUG REPORT\n';
    report += '========================\n\n';

    // Configuration status
    report += '📋 CONFIGURATION STATUS\n';
    report += `Valid: ${validation.isValid ? '✅ YES' : '❌ NO'}\n`;
    report += `Chain ID: ${chainId} (${chainId === 84532 ? 'Base Sepolia' : chainId === 8453 ? 'Base Mainnet' : 'Unknown'})\n\n`;

    // Environment variables
    report += '🔧 ENVIRONMENT VARIABLES\n';
    report += `Paymaster URL: ${validation.config.paymasterUrl ? '✅ Set' : '❌ Missing'}\n`;
    report += `Bundler URL: ${validation.config.bundlerUrl ? '✅ Set' : '❌ Missing'}\n`;
    report += `API Key: ${validation.config.apiKey ? '✅ Set' : '❌ Missing'}\n\n`;

    // Errors
    if (validation.errors.length > 0) {
        report += '❌ ERRORS\n';
        validation.errors.forEach((error, i) => {
            report += `${i + 1}. ${error}\n`;
        });
        report += '\n';
    }

    // Warnings
    if (validation.warnings.length > 0) {
        report += '⚠️ WARNINGS\n';
        validation.warnings.forEach((warning, i) => {
            report += `${i + 1}. ${warning}\n`;
        });
        report += '\n';
    }

    // Signature validation debug
    if (signatureDebug?.isSignatureError) {
        report += '🔐 SIGNATURE VALIDATION ERROR DETECTED\n';
        report += 'Possible Causes:\n';
        signatureDebug.possibleCauses.forEach((cause, i) => {
            report += `${i + 1}. ${cause}\n`;
        });
        report += '\nRecommendations:\n';
        signatureDebug.recommendations.forEach((rec, i) => {
            report += `${i + 1}. ${rec}\n`;
        });
        report += '\n';
    }

    // Quick fixes
    report += '🚀 QUICK FIXES\n';
    report += '1. Verify all environment variables are set correctly\n';
    report += '2. Check Coinbase Developer Platform project status\n';
    report += '3. Ensure contracts are allowlisted on paymaster\n';
    report += '4. Try with a smaller batch size first\n';
    report += '5. Check network connection and RPC endpoints\n';

    return report;
}

/**
 * Log ERC-4337 debug information to console
 */
export function logERC4337Debug(chainId: number = 84532, error?: Error | unknown): void {
    const report = generateERC4337DebugReport(chainId, error);
    console.log(report);
}

export { BATCH_CONFIG } from './batch-optimizer';
