<?php
/** Cerrar la sesión del panel. */
declare(strict_types=1);
require __DIR__ . '/_comun.php';

exigirPost();
cerrarSesion();
responder(200, ['ok' => true]);
