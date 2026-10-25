<?php
/**
 * "Primera vez u olvidé la contraseña": POST correo. Si el mail está habilitado, le manda un enlace (vale 1 hora)
 * para elegir contraseña. Responde siempre lo mismo, para no revelar qué mails existen.
 */
declare(strict_types=1);
require __DIR__ . '/_comun.php';

exigirPost();
$correo = mb_strtolower(entrada('correo'));

try {
    if (demasiados('enlace-ip', ip(), 5, 3600)) responder(429, ['ok' => false, 'error' => 'demasiados']);
    if (filter_var($correo, FILTER_VALIDATE_EMAIL) && in_array($correo, correosHabilitados(), true)
        && !demasiados('enlace-correo', $correo, 3, 3600)) {
        $codigo = b64(random_bytes(32));
        $db = db();
        $q = $db->prepare('SELECT COUNT(*) FROM panel_usuarios WHERE correo = ?');
        $q->execute([$correo]);
        if (!(int) $q->fetchColumn()) $db->prepare('INSERT INTO panel_usuarios (correo) VALUES (?)')->execute([$correo]);
        $db->prepare('UPDATE panel_usuarios SET enlace = ?, enlace_vence = ? WHERE correo = ?')
           ->execute([hash('sha256', $codigo), ahora(3600), $correo]);

        $enlace = 'https://' . ($_SERVER['HTTP_HOST'] ?? 'www.taxifraybentos.com.uy') . '/admin/#restablecer=' . $codigo;
        $de = config()['correo']['de'] ?? 'contacto@taxifraybentos.com.uy';
        $texto = implode("\n", [
            'Hola:',
            '',
            'Para elegir la contraseña del panel de Taxi Fray Bentos, abrí este enlace (vale 1 hora):',
            '',
            $enlace,
            '',
            'Si no lo pediste vos, ignorá este mail: tu contraseña sigue igual.',
        ]);
        $asunto = '=?UTF-8?B?' . base64_encode('Contraseña del panel de Taxi Fray Bentos') . '?=';
        $enviado = getenv('TAXI_PANEL_CORREOS')
            ? (bool) file_put_contents(getenv('TAXI_PANEL_CORREOS'), $enlace . "\n", FILE_APPEND) // pruebas
            : @mail($correo, $asunto, $texto, ['From' => $de, 'Content-Type' => 'text/plain; charset=utf-8'], '-f' . $de);
        if (!$enviado) error_log('panel/recuperar: no se pudo mandar el enlace');
    }
} catch (PDOException $e) {
    error_log('panel/recuperar: ' . $e->getMessage());
    responder(500, ['ok' => false, 'error' => 'base']);
}
responder(200, ['ok' => true]);
