<?php
/** Elegir contraseña con el enlace del mail: POST codigo + clave. Cierra las sesiones viejas y deja abierta una nueva. */
declare(strict_types=1);
require __DIR__ . '/_comun.php';

exigirPost();
$codigo = entrada('codigo');
$clave = entrada('clave');

if (mb_strlen($clave) < CLAVE_MINIMA) responder(422, ['ok' => false, 'error' => 'corta', 'minimo' => CLAVE_MINIMA]);
try {
    if (demasiados('codigo-ip', ip(), 10, 3600)) responder(429, ['ok' => false, 'error' => 'demasiados']);
    $q = db()->prepare('SELECT correo, version FROM panel_usuarios WHERE enlace = ? AND enlace <> \'\' AND enlace_vence > ?');
    $q->execute([hash('sha256', $codigo), ahora()]);
    $fila = $q->fetch(PDO::FETCH_ASSOC);
    if (!$fila || !in_array($fila['correo'], correosHabilitados(), true)) responder(400, ['ok' => false, 'error' => 'enlace']);
    $version = (int) $fila['version'] + 1;
    db()->prepare('UPDATE panel_usuarios SET clave = ?, version = ?, enlace = \'\', enlace_vence = \'\' WHERE correo = ?')
        ->execute([password_hash($clave, PASSWORD_DEFAULT), $version, $fila['correo']]);
    borrarIntentos('entrar-correo', $fila['correo']);
    iniciarSesion($fila['correo'], $version);
    responder(200, ['ok' => true, 'correo' => $fila['correo']]);
} catch (PDOException $e) {
    error_log('panel/restablecer: ' . $e->getMessage());
    responder(500, ['ok' => false, 'error' => 'base']);
}
