<?php

class Router
{
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler): void
    {
        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $pattern,
            'handler' => $handler,
        ];
    }

    public function dispatch(?string $overrideUri = null): void
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uri = $overrideUri ?? parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

        // Normalize and decode both URI and base path to handle spaces (%20 vs space)
        $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
        $base = rtrim(dirname($scriptName), '/');
        $uriDec = rawurldecode($uri ?? '/');
        $baseDec = rawurldecode($base);

        if (!$overrideUri && $baseDec && str_starts_with($uriDec, $baseDec)) {
            $uriDec = substr($uriDec, strlen($baseDec));
        }
        if ($uriDec === '' || $uriDec === false) { $uriDec = '/'; }

        // If the remaining path still includes /index.php prefix (e.g., /index.php/auth/register), strip it
        if (preg_match('#^/index\.php(?:/|$)#i', $uriDec)) {
            $uriDec = substr($uriDec, strlen('/index.php'));
            if ($uriDec === '' || $uriDec === false) { $uriDec = '/'; }
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }
            $params = $this->match($route['pattern'], $uriDec);
            if ($params !== null) {
                $handler = $route['handler'];
                $result = $handler(...array_values($params));
                // If the handler didn't already send a response, send JSON
                if ($result !== null) {
                    Response::json($result);
                }
                return;
            }
        }

        Response::json(['error' => 'Not found', 'path' => $uriDec], 404);
    }

    private function match(string $pattern, string $uri): ?array
    {
        // Simple pattern: /appointments/{id}
        $regex = preg_replace('#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#', '(?P<$1>[^/]+)', $pattern);
        $regex = '#^' . rtrim($regex, '/') . '/?$#';
        if (preg_match($regex, $uri, $m)) {
            $params = [];
            foreach ($m as $k => $v) {
                if (!is_int($k)) $params[$k] = $v;
            }
            return $params;
        }
        return null;
    }
}
