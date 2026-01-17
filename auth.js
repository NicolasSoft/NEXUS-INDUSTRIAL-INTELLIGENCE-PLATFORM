

// Verificar login
export async function login(username, password) {
  // Validação básica de credenciais de demonstração
  const demoCredentials = {
    'admin': 'admin123',
    'user': 'user123',
    'guest': 'guest123'
  };

  try {
    // Simular delay de conexão
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (demoCredentials[username] && demoCredentials[username] === password) {
      // Criar token simulado (JWT-like)
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({
        sub: username,
        role: username === 'admin' ? 'admin' : 'user',
        name: username.charAt(0).toUpperCase() + username.slice(1),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
      }));
      const signature = btoa('fake-signature');
      const token = `${header}.${payload}.${signature}`;
      
      // Salvar no localStorage
      localStorage.setItem('iot_token', token);
      localStorage.setItem('iot_user', JSON.stringify({
        username: username,
        role: username === 'admin' ? 'admin' : 'user',
        name: username.charAt(0).toUpperCase() + username.slice(1),
        loginTime: Date.now()
      }));
      
      return {
        success: true,
        message: 'Login realizado com sucesso!',
      };
    } else {
      return {
        success: false,
        message: 'Usuário ou senha incorretos. Tente: admin/admin123, user/user123 ou guest/guest123'
      };
    }
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    return {
      success: false,
      message: 'Erro ao processar login. Tente novamente.'
    };
  }
}

// Verificar se está autenticado
export function isAuthenticated() {
  const token = localStorage.getItem('iot_token');
  if (!token) return false;
  
  try {
    // Verificar formato do token
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    const payload = JSON.parse(atob(parts[1]));
    // Multiplicar por 1000 para comparar com Date.now() em milissegundos
    return payload.exp * 1000 > Date.now();
  } catch (e) {
    console.error('Token inválido:', e);
    return false;
  }
}

// Obter informações do usuário atual
export function getCurrentUser() {
  const userStr = localStorage.getItem('iot_user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

// Fazer logout
export function logout() {
  // Registrar logout
  console.log('Logout realizado');
  
  // Limpar storage
  localStorage.removeItem('iot_token');
  localStorage.removeItem('iot_user');
  
  // Redirecionar
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 500);
}

// Verificar permissões
export function hasRole(role) {
  const user = getCurrentUser();
  return user && user.role === role;
}

// Middleware de proteção de rota
export function requireAuth() {
  if (!isAuthenticated()) {
    // Salvar a página atual para redirecionamento após login
    sessionStorage.setItem('redirect_after_login', window.location.pathname);
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Verificar se token está prestes a expirar (15 minutos)
export function isTokenExpiringSoon() {
  const token = localStorage.getItem('iot_token');
  if (!token) return true;
  
  try {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    const timeUntilExpiry = (payload.exp * 1000) - Date.now();
    return timeUntilExpiry < (15 * 60 * 1000); // 15 minutos
  } catch (e) {
    return true;
  }
}