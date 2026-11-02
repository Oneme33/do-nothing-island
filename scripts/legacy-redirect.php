<?php
// Entry point for the retired /nothing-island/ directory (Apache AllowOverride None).
$query = $_SERVER['QUERY_STRING'] ?? '';
header('Location: /do-nothing-island/' . ($query !== '' ? '?' . $query : ''), true, 301);
exit;
