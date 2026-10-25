<?php
/** Entrar al panel: POST correo + clave. Si están bien, deja la cookie de sesión. */
declare(strict_types=1);
require __DIR__ . '/_comun.php';

exigirPost();
$correo = mb_strtolower(entrada('correo'));
$clave = entrada('clave');

try {
    // Freno a quien prueba contraseñas: 5 intentos fallidos por IP o 10 por mail cada 15 minutos.
    if (demasiados('entrar-ip', ip(), 5, 900, false) || demasiados('entrar-correo', $correo, 10, 900, false)) {
        responder(429, ['ok' => false, 'error' => 'demasiados']);
    }
    $fila = null;
    if (in_array($correo, correosHabilitados(), true)) {
        $q = db()->prepare('SELECT clave, version FROM panel_usuarios WHERE correo = ?');
        $q->execute([$correo]);
        $fila = $q->fetch(PDO::FETCH_ASSOC) ?: null;
    }
    // Se verifica siempre (también con un mail que no existe) para no dar pistas por el tiempo de respuesta.
    $hash = $fila['clave'] ?? '';
    $bien = password_verify($clave, $hash !== '' ? $hash : '$2y$10$VyD54Q.50QDZdZDH48e9s.SlQoj5nlKdqwbS1QAL6gk.cZpJfx/4K');
    if (!$fila || $hash === '' || !$bien) {
        demasiados('entrar-ip', ip(), 5, 900);
        demasiados('entrar-correo', $correo, 10, 900);
        responder(401, ['ok' => false, 'error' => 'datos']);
    }
    if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
        db()->prepare('UPDATE panel_usuarios SET clave = ? WHERE correo = ?')->execute([password_hash($clave, PASSWORD_DEFAULT), $correo]);
    }
    borrarIntentos('entrar-correo', $correo);
    iniciarSesion($correo, (int) $fila['version']);
    responder(200, ['ok' => true, 'correo' => $correo]);
} catch (PDOException $e) {
    error_log('panel/entrar: ' . $e->getMessage());
    responder(500, ['ok' => false, 'error' => 'base']);
}
