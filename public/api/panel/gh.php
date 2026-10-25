<?php
/**
 * Puente entre el panel y GitHub. El panel (Sveltia CMS, ver public/admin/config.yml) le habla a esta dirección
 * como si fuera GitHub: /api/panel/gh.php/api/v3/… (REST) y /api/panel/gh.php/api/graphql (GraphQL).
 * Si hay sesión abierta, el pedido sigue a api.github.com con la llave de taxi-config.php; si no, 401.
 * Solo deja pasar lo que el panel necesita de este repositorio.
 */
declare(strict_types=1);
require __DIR__ . '/_comun.php';

$metodo = $_SERVER['REQUEST_METHOD'];
if ($metodo === 'OPTIONS') responder(204, []);
if ($metodo !== 'GET' && $metodo !== 'HEAD') exigirMismoSitio();

try {
    if (!sesion()) responder(401, ['message' => 'Bad credentials', 'error' => 'sin-sesion']);
} catch (PDOException $e) {
    error_log('panel/gh: ' . $e->getMessage());
    responder(500, ['message' => 'Server error']);
}
$token = trim((string) (config()['panel']['github_token'] ?? ''));
if ($token === '') responder(503, ['message' => 'Falta la llave de GitHub en taxi-config.php', 'error' => 'sin-llave']);

// La ruta se toma tal cual llegó (codificada) para reenviarla igual; se revisa ya decodificada.
$crudo = preg_match('#/gh\.php(/[^?]*)#', (string) ($_SERVER['REQUEST_URI'] ?? ''), $m) ? $m[1] : '';
$ruta = rawurldecode($crudo);
if (str_contains($ruta, '..')) responder(403, ['message' => 'Forbidden']);
if (preg_match('#^/api/graphql/?$#', $ruta)) {
    $destino = '/graphql';
    if ($metodo !== 'POST') responder(405, ['message' => 'Method not allowed']);
} elseif (preg_match('#^/api/v3(/.*)$#', $ruta, $m)) {
    $repo = preg_quote(REPO, '#');
    if (!str_starts_with($crudo, "/api/v3/") || !preg_match("#^/(user|rate_limit|repos/$repo(/.*)?)$#i", $m[1])) responder(403, ['message' => 'Forbidden']);
    $destino = substr($crudo, strlen('/api/v3'));
} else {
    responder(404, ['message' => 'Not Found']);
}

$base = rtrim((string) (config()['panel']['github_api'] ?? 'https://api.github.com'), '/');
$url = $base . $destino . (($_SERVER['QUERY_STRING'] ?? '') !== '' ? '?' . $_SERVER['QUERY_STRING'] : '');

$cabeceras = [
    'Authorization: Bearer ' . $token,
    'User-Agent: taxifraybentos-panel',
    'X-GitHub-Api-Version: 2022-11-28',
    'Accept: ' . ($_SERVER['HTTP_ACCEPT'] ?? 'application/vnd.github+json'),
];
if (!empty($_SERVER['CONTENT_TYPE'])) $cabeceras[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
if (!empty($_SERVER['HTTP_IF_NONE_MATCH'])) $cabeceras[] = 'If-None-Match: ' . $_SERVER['HTTP_IF_NONE_MATCH'];

$respuesta = [];
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $metodo,
    CURLOPT_HTTPHEADER => $cabeceras,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_NOBODY => $metodo === 'HEAD',
    CURLOPT_HEADERFUNCTION => function ($ch, string $linea) use (&$respuesta) {
        if (preg_match('/^(content-type|etag|link|last-modified|x-ratelimit-[a-z]+|x-github-request-id):\s*(.*)$/i', trim($linea), $m)) {
            $respuesta[] = $m[1] . ': ' . $m[2];
        }
        return strlen($linea);
    },
]);
if (!in_array($metodo, ['GET', 'HEAD'], true)) curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
$cuerpo = curl_exec($ch);
$codigo = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
if ($cuerpo === false || $codigo === 0) {
    error_log('panel/gh: ' . curl_error($ch));
    responder(502, ['message' => 'GitHub no respondió']);
}

http_response_code($codigo);
foreach ($respuesta as $c) header($c);
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
echo $cuerpo;
