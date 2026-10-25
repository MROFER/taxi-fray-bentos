<?php
/** ¿Hay una sesión abierta? Lo usa /admin/ al cargar. También avisa si falta la llave de GitHub en el servidor. */
declare(strict_types=1);
require __DIR__ . '/_comun.php';

try {
    $correo = sesion();
} catch (PDOException $e) {
    error_log('panel/sesion: ' . $e->getMessage());
    responder(500, ['ok' => false, 'error' => 'base']);
}
$llave = trim((string) (config()['panel']['github_token'] ?? '')) !== '';
if (!$correo) responder(401, ['ok' => false, 'error' => 'sin-sesion', 'llave' => $llave]);
responder(200, ['ok' => true, 'correo' => $correo, 'llave' => $llave]);
