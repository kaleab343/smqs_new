<?php

class Jwt
{
    public static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    public static function base64UrlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder) { $data .= str_repeat('=', 4 - $remainder); }
        return base64_decode(strtr($data, '-_', '+/')) ?: '';
    }

    public static function encode(array $payload, string $secret, string $alg = 'HS256'): string
    {
        $header = ['typ' => 'JWT', 'alg' => $alg];
        $segments = [
            self::base64UrlEncode(json_encode($header) ?: '{}'),
            self::base64UrlEncode(json_encode($payload) ?: '{}'),
        ];
        $signingInput = implode('.', $segments);
        $signature = self::sign($signingInput, $secret, $alg);
        $segments[] = self::base64UrlEncode($signature);
        return implode('.', $segments);
    }

    public static function decode(string $jwt, string $secret, array $allowedAlgs = ['HS256']): ?array
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) return null;
        [$headB64, $payloadB64, $sigB64] = $parts;
        $header = json_decode(self::base64UrlDecode($headB64), true) ?: [];
        $payload = json_decode(self::base64UrlDecode($payloadB64), true) ?: [];
        $signature = self::base64UrlDecode($sigB64);
        $alg = $header['alg'] ?? 'HS256';
        if (!in_array($alg, $allowedAlgs, true)) return null;
        $calc = self::sign($headB64 . '.' . $payloadB64, $secret, $alg);
        if (!hash_equals($calc, $signature)) return null;
        // Exp check
        if (isset($payload['exp']) && time() >= (int)$payload['exp']) return null;
        return $payload;
    }

    private static function sign(string $input, string $secret, string $alg): string
    {
        switch ($alg) {
            case 'HS256': return hash_hmac('sha256', $input, $secret, true);
            case 'HS384': return hash_hmac('sha384', $input, $secret, true);
            case 'HS512': return hash_hmac('sha512', $input, $secret, true);
            default: throw new Exception('Unsupported algorithm');
        }
    }

    public static function bearerToken(): ?string
    {
        $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['Authorization'] ?? '';
        if (!$hdr && function_exists('apache_request_headers')) {
            $all = apache_request_headers();
            foreach ($all as $k => $v) {
                if (strtolower($k) === 'authorization') { $hdr = $v; break; }
            }
        }
        if (!$hdr) return null;
        if (preg_match('/^Bearer\s+(.+)$/i', trim($hdr), $m)) return trim($m[1]);
        return null;
    }
}
