<?php
/**
 * Ingreso al panel (/admin/) con mail y contraseña. Funciones comunes de los archivos de esta carpeta.
 *
 * Cómo funciona: la persona entra con su mail y contraseña; el servidor le da una cookie firmada y, mientras
 * la tenga, gh.php le pasa al panel los pedidos a GitHub agregando la llave (token) que vive en taxi-config.php,
 * fuera de la carpeta pública. La llave nunca llega al navegador.
 *
 * En taxi-config.php (ver servidor/taxi-config.ejemplo.php):
 *   'panel' => [
 *     'github_token' => 'github_pat_…',          // token "fine-grained": Contents lectura y escritura, solo este repo
 *     'correos' => ['contacto@taxifraybentos.com.uy'], // quiénes pueden entrar (vacío = el correo de avisos)
 *   ]
 * Las contraseñas se guardan cifradas (password_hash) en la misma base MySQL del formulario; las tablas se crean solas.
 */
declare(strict_types=1);

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(404);
    exit;
}

const COOKIE = 'tfb_panel';
const DURACION_SESION = 30 * 24 * 3600;
const CLAVE_MINIMA = 10;
const REPO = 'MROFER/taxi-fray-bentos';

function responder(int $codigo, array $cuerpo): never
{
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE);
    exit;
}

function config(): array
{
    static $config = null;
    if ($config !== null) return $config;
    $ruta = getenv('TAXI_CONFIG') ?: dirname(__DIR__, 3) . '/taxi-config.php';
    if (!is_file($ruta)) {
        error_log('panel: falta ' . $ruta);
        responder(503, ['ok' => false, 'error' => 'sin-configurar']);
    }
    return $config = require $ruta;
}

/** Mails habilitados para entrar, en minúsculas. */
function correosHabilitados(): array
{
    $c = config();
    $lista = $c['panel']['correos'] ?? [];
    if (!$lista && !empty($c['correo']['para'])) $lista = [$c['correo']['para']];
    return array_values(array_filter(array_map(fn ($m) => mb_strtolower(trim((string) $m)), $lista)));
}

function db(): PDO
{
    static $db = null;
    if ($db) return $db;
    $c = config()['db'];
    $db = new PDO($c['dsn'], $c['usuario'] ?? null, $c['clave'] ?? null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $mysql = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
    $texto = fn (int $n) => $mysql ? "VARCHAR($n)" : 'TEXT';
    $db->exec('CREATE TABLE IF NOT EXISTS panel_usuarios (
        correo ' . $texto(120) . ' NOT NULL PRIMARY KEY,
        clave ' . $texto(255) . ' NOT NULL DEFAULT \'\',
        version INTEGER NOT NULL DEFAULT 1,
        enlace ' . $texto(64) . ' NOT NULL DEFAULT \'\',
        enlace_vence ' . $texto(20) . ' NOT NULL DEFAULT \'\'
      )' . ($mysql ? ' DEFAULT CHARSET=utf8mb4' : ''));
    $db->exec('CREATE TABLE IF NOT EXISTS panel_intentos (
        quien ' . $texto(64) . ' NOT NULL,
        tipo ' . $texto(20) . ' NOT NULL,
        creado ' . $texto(20) . ' NOT NULL
      )' . ($mysql ? ' DEFAULT CHARSET=utf8mb4' : ''));
    $db->exec('CREATE TABLE IF NOT EXISTS panel_ajustes (
        nombre ' . $texto(40) . ' NOT NULL PRIMARY KEY,
        valor ' . $texto(255) . ' NOT NULL
      )' . ($mysql ? ' DEFAULT CHARSET=utf8mb4' : ''));
    return $db;
}

/** Secreto para firmar las cookies: se genera solo la primera vez y queda en la base. */
function secreto(): string
{
    $q = db()->prepare('SELECT valor FROM panel_ajustes WHERE nombre = ?');
    $q->execute(['secreto']);
    $s = $q->fetchColumn();
    if (is_string($s) && strlen($s) >= 32) return $s;
    $s = bin2hex(random_bytes(32));
    db()->prepare('INSERT INTO panel_ajustes (nombre, valor) VALUES (?, ?)')->execute(['secreto', $s]);
    return $s;
}

function ahora(int $mas = 0): string
{
    return gmdate('Y-m-d H:i:s', time() + $mas);
}

/** Cuenta un intento (de entrar o de pedir enlace) y dice si ya se pasó del límite en la ventana de tiempo. */
function demasiados(string $tipo, string $quien, int $limite, int $segundos, bool $sumar = true): bool
{
    $quien = hash('sha256', $quien . (config()['sal'] ?? 'taxi'));
    $db = db();
    $db->prepare('DELETE FROM panel_intentos WHERE creado < ?')->execute([ahora(-86400)]);
    $q = $db->prepare('SELECT COUNT(*) FROM panel_intentos WHERE tipo = ? AND quien = ? AND creado > ?');
    $q->execute([$tipo, $quien, ahora(-$segundos)]);
    $pasado = (int) $q->fetchColumn() >= $limite;
    if ($sumar && !$pasado) $db->prepare('INSERT INTO panel_intentos (quien, tipo, creado) VALUES (?, ?, ?)')->execute([$quien, $tipo, ahora()]);
    return $pasado;
}

function borrarIntentos(string $tipo, string $quien): void
{
    db()->prepare('DELETE FROM panel_intentos WHERE tipo = ? AND quien = ?')
        ->execute([$tipo, hash('sha256', $quien . (config()['sal'] ?? 'taxi'))]);
}

function ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? '';
}

function b64(string $s): string
{
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}

function esHttps(): bool
{
    return ($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

function ponerCookie(string $valor, int $vence): void
{
    setcookie(COOKIE, $valor, [
        'expires' => $vence,
        'path' => '/api/panel/',
        'secure' => esHttps(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

function iniciarSesion(string $correo, int $version): void
{
    $vence = time() + DURACION_SESION;
    $datos = b64(json_encode(['c' => $correo, 'v' => $version, 'x' => $vence]));
    ponerCookie($datos . '.' . b64(hash_hmac('sha256', $datos, secreto(), true)), $vence);
}

function cerrarSesion(): void
{
    ponerCookie('', time() - 3600);
}

/** Mail de la sesión abierta, o null. Comprueba firma, vencimiento, que siga habilitado y que no haya cambiado la contraseña. */
function sesion(): ?string
{
    $cookie = (string) ($_COOKIE[COOKIE] ?? '');
    if (!preg_match('/^([\w-]+)\.([\w-]+)$/', $cookie, $m)) return null;
    if (!hash_equals(b64(hash_hmac('sha256', $m[1], secreto(), true)), $m[2])) return null;
    $d = json_decode((string) base64_decode(strtr($m[1], '-_', '+/')), true);
    if (!is_array($d) || ($d['x'] ?? 0) < time()) return null;
    $correo = (string) ($d['c'] ?? '');
    if (!in_array($correo, correosHabilitados(), true)) return null;
    $q = db()->prepare('SELECT version FROM panel_usuarios WHERE correo = ?');
    $q->execute([$correo]);
    return (int) $q->fetchColumn() === (int) ($d['v'] ?? -1) ? $correo : null;
}

/** Los pedidos que cambian algo solo se aceptan desde el propio sitio. */
function exigirMismoSitio(): void
{
    $origen = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origen !== '' && parse_url($origen, PHP_URL_HOST) !== parse_url('//' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST)) {
        responder(403, ['ok' => false, 'error' => 'origen']);
    }
}

function exigirPost(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Allow: POST');
        responder(405, ['ok' => false, 'error' => 'metodo']);
    }
    exigirMismoSitio();
}

/** Datos del pedido: JSON o formulario. */
function entrada(string $nombre): string
{
    static $json = null;
    if ($json === null) {
        $json = json_decode((string) file_get_contents('php://input'), true);
        if (!is_array($json)) $json = [];
    }
    return trim((string) ($json[$nombre] ?? $_POST[$nombre] ?? ''));
}
