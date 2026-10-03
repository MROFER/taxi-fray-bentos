<?php
/**
 * Recibe el formulario "Solicitud de alta" de choferes (sección Para choferes).
 * Guarda la solicitud en MySQL y avisa por correo. Responde JSON.
 *
 * Los datos de la base y del correo NO van en el repositorio: se leen de taxi-config.php,
 * fuera de la carpeta pública (en Hostinger: domains/taxifraybentos.com.uy/taxi-config.php).
 * Modelo en servidor/taxi-config.ejemplo.php (en el repositorio). La tabla se crea sola la primera vez.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function responder(int $codigo, array $cuerpo): never
{
    http_response_code($codigo);
    echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    responder(405, ['ok' => false, 'error' => 'metodo']);
}

$rutaConfig = getenv('TAXI_CONFIG') ?: dirname(__DIR__, 2) . '/taxi-config.php';
if (!is_file($rutaConfig)) {
    error_log('alta.php: falta ' . $rutaConfig);
    responder(503, ['ok' => false, 'error' => 'sin-configurar']);
}
$config = require $rutaConfig;

// Trampa para robots: el campo "web" está oculto, una persona lo deja vacío.
if (trim((string) ($_POST['web'] ?? '')) !== '') {
    responder(200, ['ok' => true]);
}

/** Texto de una línea, sin espacios de más, recortado a $max caracteres. */
function campo(string $nombre, int $max): string
{
    $v = preg_replace('/\s+/u', ' ', trim((string) ($_POST[$nombre] ?? ''))) ?? '';
    return mb_substr($v, 0, $max);
}

$datos = [
    'titular' => campo('titular', 100),
    'movil' => campo('movil', 60),
    'telefono' => campo('telefono', 30),
    'permiso' => mb_strtoupper(campo('permiso', 20)),
    'parada' => campo('parada', 120),
    'correo' => campo('correo', 120),
];

$errores = [];
if (mb_strlen($datos['titular']) < 3) $errores[] = 'titular';
$digitos = preg_replace('/\D/', '', $datos['telefono']) ?? '';
if (strlen($digitos) < 8 || strlen($digitos) > 15) $errores[] = 'telefono';
if (mb_strlen($datos['permiso']) < 3) $errores[] = 'permiso';
if ($datos['correo'] !== '' && !filter_var($datos['correo'], FILTER_VALIDATE_EMAIL)) $errores[] = 'correo';
if ($errores) {
    responder(422, ['ok' => false, 'error' => 'datos', 'campos' => $errores]);
}

try {
    $db = new PDO($config['db']['dsn'], $config['db']['usuario'] ?? null, $config['db']['clave'] ?? null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    $mysql = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
    $db->exec($mysql
        ? 'CREATE TABLE IF NOT EXISTS solicitudes_alta (
             id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
             creado DATETIME NOT NULL,
             titular VARCHAR(100) NOT NULL,
             movil VARCHAR(60) NOT NULL DEFAULT \'\',
             telefono VARCHAR(30) NOT NULL,
             permiso VARCHAR(20) NOT NULL,
             parada VARCHAR(120) NOT NULL DEFAULT \'\',
             correo VARCHAR(120) NOT NULL DEFAULT \'\',
             ip CHAR(64) NOT NULL,
             estado VARCHAR(20) NOT NULL DEFAULT \'pendiente\',
             INDEX (ip, creado)
           ) DEFAULT CHARSET=utf8mb4'
        : 'CREATE TABLE IF NOT EXISTS solicitudes_alta (
             id INTEGER PRIMARY KEY AUTOINCREMENT, creado TEXT NOT NULL, titular TEXT NOT NULL,
             movil TEXT NOT NULL DEFAULT \'\', telefono TEXT NOT NULL, permiso TEXT NOT NULL,
             parada TEXT NOT NULL DEFAULT \'\', correo TEXT NOT NULL DEFAULT \'\', ip TEXT NOT NULL,
             estado TEXT NOT NULL DEFAULT \'pendiente\'
           )');

    // La IP se guarda cifrada (hash): alcanza para frenar envíos repetidos sin guardar el dato personal.
    $ip = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . ($config['sal'] ?? 'taxi'));
    $ahora = gmdate('Y-m-d H:i:s');
    $haceUnaHora = gmdate('Y-m-d H:i:s', time() - 3600);

    $q = $db->prepare('SELECT COUNT(*) FROM solicitudes_alta WHERE ip = ? AND creado > ?');
    $q->execute([$ip, $haceUnaHora]);
    if ((int) $q->fetchColumn() >= 5) {
        responder(429, ['ok' => false, 'error' => 'demasiadas']);
    }

    $db->prepare('INSERT INTO solicitudes_alta (creado, titular, movil, telefono, permiso, parada, correo, ip)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
       ->execute([$ahora, $datos['titular'], $datos['movil'], $datos['telefono'], $datos['permiso'],
                  $datos['parada'], $datos['correo'], $ip]);
    $id = (int) $db->lastInsertId();
} catch (Throwable $e) {
    error_log('alta.php: ' . $e->getMessage());
    responder(500, ['ok' => false, 'error' => 'base']);
}

// Aviso por correo. Si falla, la solicitud igual quedó guardada.
if (!empty($config['correo']['para'])) {
    $lineas = [
        "Nueva solicitud de alta N.º $id",
        '',
        "Titular: {$datos['titular']}",
        'Nombre del móvil: ' . ($datos['movil'] ?: '-'),
        "Teléfono: {$datos['telefono']}",
        "Permiso / chapa: {$datos['permiso']}",
        'Parada habitual: ' . ($datos['parada'] ?: '-'),
        'Correo: ' . ($datos['correo'] ?: '-'),
    ];
    $de = $config['correo']['de'] ?? $config['correo']['para'];
    $cabeceras = [
        'From' => $de,
        'Content-Type' => 'text/plain; charset=utf-8',
    ];
    if ($datos['correo'] !== '') $cabeceras['Reply-To'] = $datos['correo'];
    $asunto = '=?UTF-8?B?' . base64_encode("Solicitud de alta: {$datos['titular']} ({$datos['permiso']})") . '?=';
    if (!@mail($config['correo']['para'], $asunto, implode("\n", $lineas), $cabeceras, '-f' . $de)) {
        error_log("alta.php: no se pudo enviar el aviso de la solicitud $id");
    }
}

responder(200, ['ok' => true, 'id' => $id]);
