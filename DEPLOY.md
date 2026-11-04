# Despliegue de LearnAI en un VPS (Hostinger)

Documentación de cómo se levantó el proyecto en producción: `https://uselearnai.tech`.

> No guardes en este archivo claves, contraseñas ni valores de `.env`.

## 1. Resumen

| Elemento | Valor |
|---|---|
| Proveedor | Hostinger VPS (KVM) |
| SO | Ubuntu 26.04 LTS |
| Recursos | 1 vCPU, 3.8 GB RAM, 2 GB swap, 48 GB de disco |
| IP | 187.41.117.146 (IPv6 `2a02:4780:c6:2b3a::1`) |
| Dominio | `uselearnai.tech` (DNS en Hostinger) |
| Usuario de trabajo | `deploy` (con sudo) |
| Repo en el servidor | `~/LearnAI`, rama `main` |
| Proxy / HTTPS | Caddy (certificados Let's Encrypt automáticos) |

### Arquitectura

```
Internet ─► :80/:443 ─► web (Caddy)
                          ├─ /          ─► SPA estática (frontend compilado)
                          └─ /api/*     ─► api:8000 (FastAPI, quita el prefijo /api)
                                              ├─ mongo:27017
                                              ├─ qdrant:6333
                                              └─ redis:6379  ◄─ worker (RQ)
```

- Solo el servicio `web` publica puertos. Mongo, Qdrant y Redis quedan en la red interna de Docker.
- El LLM va por API (Gemini y OpenAI); no hay modelos locales.

## 2. Archivos de producción del repo

| Archivo | Función |
|---|---|
| `docker-compose.prod.yml` | Servicios `mongo`, `qdrant`, `redis`, `api`, `worker`, `web`. Sin `--reload`, volúmenes con nombre, `restart: unless-stopped`. |
| `frontend/Dockerfile.prod` | Build multi-etapa: compila con pnpm y sirve con Caddy. |
| `frontend/Caddyfile` | Sirve la SPA, proxy de `/api/*` a la API, redirección de `www` al dominio raíz. |
| `.env.prod.example` | Plantilla del `.env` de la raíz (`DOMAIN`, `VITE_GOOGLE_CLIENT_ID`). |
| `backend/.env.prod.example` | Plantilla del `backend/.env` de producción. |

Cambio de código asociado: la cookie de sesión usa `SESSION_COOKIE_SECURE` (por defecto `false`; en producción `true`).

## 3. Preparación del servidor

Todos los comandos, como `deploy` salvo que se indique.

### 3.1 Acceso SSH

1. En el panel de Hostinger se registró una llave SSH pública. Hostinger la instala **solo para `root`**.
2. Como root, se creó el usuario `deploy` con sudo:
   ```
   adduser deploy
   usermod -aG sudo deploy
   ```
3. La llave pública hay que instalarla también para `deploy`. El directorio `.ssh` debe ser de ese usuario y con permisos estrictos:
   ```
   sudo chown deploy:deploy ~/.ssh
   chmod 700 ~/.ssh
   echo "ssh-ed25519 AAAA... comentario" > ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```
4. Prueba desde el PC: `ssh deploy@187.41.117.146`. La passphrase que pide la usa tu PC para abrir la llave privada; no es la del servidor.

### 3.2 Actualizar el sistema

```
sudo apt update && sudo apt upgrade -y
sudo reboot
```

### 3.3 Firewall (UFW)

Permitir SSH **antes** de activarlo, o te cierras el acceso:

```
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### 3.4 Endurecer SSH

En Ubuntu reciente, SSH usa el **primer valor que encuentra** y lee `/etc/ssh/sshd_config.d/*.conf` en orden alfabético. Por eso `50-cloud-init.conf` (`PasswordAuthentication yes`) ganaba a `60-cloudimg-settings.conf` (`no`). Se creó un archivo propio que se lee primero:

```
sudo tee /etc/ssh/sshd_config.d/00-hardening.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
EOF
sudo sshd -t
sudo sshd -T | grep -Ei "permitrootlogin|passwordauthentication"
sudo systemctl restart ssh
```

Antes de cerrar la sesión, comprobar desde **otra ventana** que `deploy` sigue entrando con llave y que `root` da `Permission denied (publickey)`.

### 3.5 fail2ban

```
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

### 3.6 Docker (repositorio oficial)

Ubuntu 26.04 (`resolute`) está soportado oficialmente.

```
sudo apt remove $(dpkg --get-selections docker.io docker-compose docker-compose-v2 docker-doc docker-buildx podman-docker containerd runc | cut -f1)
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo docker run hello-world
```

`deploy` no está en el grupo `docker`, por lo que se usa `sudo docker ...`.

### 3.7 Swap de 2 GB (permanente)

```
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf
sudo sysctl --system
free -h
```

## 4. DNS

En Hostinger → Dominios → Registros DNS:

| Tipo | Nombre | Contenido |
|---|---|---|
| A | `@` | `187.41.117.146` |
| AAAA | `@` | `2a02:4780:c6:2b3a::1` (es la IPv6 del VPS, se conserva) |
| CNAME | `www` | `uselearnai.tech` |

Antes de borrar un `AAAA`, comprobar con `ip -6 addr show scope global` que no sea la IPv6 del VPS. Verificar con `nslookup uselearnai.tech`.

## 5. Código en el servidor

### 5.1 Deploy key de GitHub (solo lectura)

```
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -C "learnai-vps-deploy" -N ""
cat ~/.ssh/github_deploy.pub
```

Se añade la parte **pública** en GitHub → repo → Settings → Deploy keys, sin marcar *Allow write access*. Luego:

```
cat >> ~/.ssh/config <<'EOF'
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/github_deploy
    IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
ssh -T git@github.com
```

La huella oficial de GitHub (ED25519) es `SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU`.

### 5.2 Clonar

```
git clone git@github.com:aldortega/LearnAI.git ~/LearnAI
cd ~/LearnAI
```

(Durante la puesta en marcha se usó la rama `chore/prod-deploy`; ya está mergeada a `main`, PR #23.)

### 5.3 Variables de entorno (solo existen en el servidor)

```
cp .env.prod.example .env
cp backend/.env.prod.example backend/.env
chmod 600 .env backend/.env
echo ".env" >> .git/info/exclude
```

`.env` (raíz): `DOMAIN` y `VITE_GOOGLE_CLIENT_ID` (mismo ID que `GOOGLE_CLIENT_ID`).

`backend/.env`: valores fijos para producción:

```
MONGODB_URI=mongodb://mongo:27017
REDIS_URL=redis://redis:6379/0
QDRANT_URL=http://qdrant:6333
SESSION_COOKIE_SECURE=true
FRONTEND_ORIGIN=https://uselearnai.tech
FRONTEND_URL=https://uselearnai.tech
```

Y rellenar a mano: `SESSION_SECRET` (nuevo, `openssl rand -hex 32`), `GOOGLE_CLIENT_ID`, claves de Gemini y OpenAI, Supabase, LlamaCloud y Resend. Comprobar sin mostrar valores:

```
sed -E 's/=.*/=<ok>/' backend/.env
grep -nE '^[A-Z_]+=$' backend/.env
```

## 6. Construir y arrancar

El primer build tarda entre 5 y 15 minutos (descarga Chromium de Playwright). Para que no se corte si cae el SSH:

```
sudo -v
nohup sudo docker compose -f docker-compose.prod.yml build > ~/build.log 2>&1 &
tail -f ~/build.log
```

Ejecutar `sudo -v` antes: sin él, `sudo` en segundo plano se queda esperando la contraseña.

```
sudo docker compose -f docker-compose.prod.yml up -d
sudo docker compose -f docker-compose.prod.yml ps
sudo docker compose -f docker-compose.prod.yml logs --tail=25 api
sudo docker compose -f docker-compose.prod.yml logs --tail=25 web
```

Señales de que va bien: la API termina con `Application startup complete`, y Caddy muestra `certificate obtained successfully` para el dominio y `www`.

## 7. Operación diaria

| Tarea | Comando (en `~/LearnAI`) |
|---|---|
| Actualizar la app | `git pull && sudo docker compose -f docker-compose.prod.yml up -d --build` |
| Estado | `sudo docker compose -f docker-compose.prod.yml ps` |
| Logs | `sudo docker compose -f docker-compose.prod.yml logs -f --tail=50 <servicio>` |
| Reiniciar un servicio | `sudo docker compose -f docker-compose.prod.yml restart <servicio>` |
| Consumo | `sudo docker stats --no-stream` y `free -h` |
| Parar todo | `sudo docker compose -f docker-compose.prod.yml down` (sin `-v`, para conservar los datos) |

> `down -v` borra los volúmenes, es decir, Mongo y Qdrant.

Si cambia `VITE_*` en `.env`, hay que reconstruir `web` (`up -d --build web`), porque se incrusta en el build.

## 8. Problemas encontrados y soluciones

| Síntoma | Causa | Solución |
|---|---|---|
| `ssh deploy@...` pedía contraseña | No existía `~/.ssh/authorized_keys` de `deploy` y `.ssh` era de `root` | Corregir dueño y permisos e instalar la llave (sección 3.1) |
| `passwordauthentication yes` pese a editar | Orden alfabético de `sshd_config.d` | Archivo `00-hardening.conf` (sección 3.4) |
| `nohup sudo ... &` no avanzaba (`Stopped`) | `sudo` pidiendo contraseña en segundo plano | `sudo -v` antes; `kill -9 %N` al trabajo parado |
| Pantalla en blanco, `Missing required parameter client_id` | `VITE_GOOGLE_CLIENT_ID` vacío al compilar | Rellenarlo en `.env` y `up -d --build web` |
| `git push` a `main` rechazado | La PR #22 ya estaba mergeada en GitHub | Alinear `main` con `origin/main` y rebasar la rama |
| `pnpm` falla en WSL | WSL ejecuta el `pnpm` de Windows | Usar `docker compose run --rm --no-deps frontend pnpm run lint` |

## 9. Seguridad: estado y pendientes

Hecho: login SSH solo con llave, root deshabilitado, UFW, fail2ban, bases de datos sin puertos públicos, HTTPS con renovación automática, cookie de sesión `secure`, deploy key de solo lectura.

Pendiente o por decidir:

- **Backups** de Mongo y Qdrant (hoy solo viven en volúmenes del VPS).
- **Google login:** `https://uselearnai.tech` debe figurar en los orígenes autorizados de JavaScript del cliente OAuth.
- **Llave SSH personal:** una captura de pantalla expuso la privada de la llave usada para entrar al servidor. Se decidió no rotarla; es el punto más débil del acceso.
- **`SESSION_SECRET`:** no reutilizar valores pegados en chats o capturas.
- Añadir `.env` al `.gitignore` de la raíz del repo.
- `unattended-upgrades` para parches de seguridad automáticos.
- Mongo no tiene autenticación (solo es accesible desde la red interna de Docker).
- Automatizar el despliegue (GitHub Action por SSH).

## 10. Referencias

- Docker Engine en Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Claude Code (instalación): https://code.claude.com/docs/en/setup
