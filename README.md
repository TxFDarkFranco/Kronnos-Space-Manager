# Kronnos Space Manager 🚀

Una aplicación élite de gestión y verificación de almacenamiento de PC, diseñada con una arquitectura estética premium (Hextech/SaaS) para auditar hasta el último megabyte de tu sistema, visualizando la salud de tus discos, identificando aplicaciones con un escaneo quirúrgico, revelando iconos ocultos y desinstalando con un clic.

---

## 💻 Para Usuarios (Instalación Rápida)

1. Ve a la carpeta `dist/` que se genera cuando compilas el proyecto.
2. Ejecuta el archivo instalador **`Kronnos Space Manager Setup 1.0.0.exe`**.
3. Sigue las instrucciones del instalador y listo, la app verificará los discos cada que abra.

## 👨‍💻 Para Desarrolladores (Git & Código Fuente)

Si quieres agregar mejoras visuales o lógicas personalizadas:

**Requisitos previos:**
- Tener instalado [Node.js](https://nodejs.org/en/)

**Arrancar en entorno de desarrollo:**
```shell
git clone <tu-repositorio-url>
cd kronnos-storage-manager
npm install
npm start
```

## 📦 Compilación (Empaquetar la aplicación)

Si a futuro quieres volver a sacar un **instalador (.exe)** para enviarle a otra persona, abre tu consola, asegúrate de estar en la raíz de esta carpeta y corre el comando:

```shell
npm run dist
```
Esto autocompilará el código y expulsará un ejecutable en la carpeta oculta `dist/`.
