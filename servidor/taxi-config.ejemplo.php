<?php
// Copiar como taxi-config.php UN NIVEL ARRIBA de public_html
// (en Hostinger: domains/taxifraybentos.com.uy/taxi-config.php) y completar.
// No subir el archivo real al repositorio.
return [
    'db' => [
        // Hostinger → Bases de datos → MySQL: nombre de la base, usuario y contraseña.
        'dsn' => 'mysql:host=localhost;dbname=u000000000_taxi;charset=utf8mb4',
        'usuario' => 'u000000000_taxi',
        'clave' => 'CONTRASEÑA',
    ],
    'correo' => [
        'para' => 'contacto@taxifraybentos.com.uy', // a dónde llega el aviso de cada solicitud
        'de' => 'contacto@taxifraybentos.com.uy',   // tiene que ser una casilla del dominio
    ],
    // Texto al azar (cualquiera) para cifrar las IP.
    'sal' => 'cambiar-por-un-texto-al-azar',
];
