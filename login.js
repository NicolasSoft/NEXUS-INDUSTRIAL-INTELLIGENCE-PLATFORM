// login.js - Lógica do login com melhorias visuais
import { login } from './auth.js';

document.addEventListener('DOMContentLoaded', function() {
  // Elementos DOM
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const loginStatus = document.getElementById('loginStatus');
  const loader = document.getElementById('loader');
  const loginBtn = document.getElementById('loginBtn');
  const btnText = document.getElementById('btnText');
  const loginProgress = document.getElementById('loginProgress');

  // Inicializar
  initializeLoginPage();

  function initializeLoginPage() {
    // Verificar se já está logado
    checkExistingLogin();
    
    // Auto-focus no username
    setTimeout(() => {
      usernameInput.focus();
      usernameInput.parentElement.classList.add('focused');
    }, 500);
    
    // Toggle password visibility
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
    
    // Form submission
    loginForm.addEventListener('submit', handleLogin);
    
    // Carregar credenciais salvas
    loadSavedCredentials();
    
    // Animar inputs ao focar
    setupInputAnimations();
  }

  function togglePasswordVisibility() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.innerHTML = type === 'password' ? 
      '<i class="fas fa-eye"></i>' : 
      '<i class="fas fa-eye-slash"></i>';
    
    // Animação no ícone
    this.style.transform = 'scale(1.2)';
    setTimeout(() => {
      this.style.transform = 'scale(1)';
    }, 200);
  }

  function setupInputAnimations() {
    const inputs = [usernameInput, passwordInput];
    
    inputs.forEach(input => {
      input.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
        loginProgress.style.width = '50%';
      });
      
      input.addEventListener('blur', function() {
        if (!this.value) {
          this.parentElement.classList.remove('focused');
        }
      });
      
      input.addEventListener('input', function() {
        if (this.value) {
          this.parentElement.classList.add('has-value');
        } else {
          this.parentElement.classList.remove('has-value');
        }
      });
    });
  }

  async function handleLogin(event) {
    event.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Validar inputs
    if (!validateInputs(username, password)) return;
    
    // Mostrar estado de carregamento
    setLoadingState(true);
    
    try {
      // Tentar login
      const result = await login(username, password);
      
      if (result.success) {
        // Login bem-sucedido
        showStatus(result.message, 'success');
        loginProgress.style.width = '100%';
        
        // Salvar preferências
        if (rememberMe) {
          localStorage.setItem('remembered_user', username);
        } else {
          localStorage.removeItem('remembered_user');
        }
        
        // Redirecionar após delay
        setTimeout(() => {
          const redirectTo = sessionStorage.getItem('redirect_after_login') || 'index.html';
          sessionStorage.removeItem('redirect_after_login');
          window.location.href = redirectTo;
        }, 1500);
        
      } else {
        // Login falhou
        showStatus(result.message, 'error');
        setLoadingState(false);
        loginProgress.style.width = '0%';
        
        // Animação de erro
        loginForm.classList.add('error-shake');
        setTimeout(() => {
          loginForm.classList.remove('error-shake');
        }, 500);
        
        // Focar no campo de erro
        if (result.field === 'username') {
          usernameInput.focus();
        } else {
          passwordInput.focus();
        }
      }
    } catch (error) {
      showStatus('Erro na conexão com o servidor', 'error');
      setLoadingState(false);
      loginProgress.style.width = '0%';
      console.error('Login error:', error);
    }
  }

  function validateInputs(username, password) {
    // Reset status
    showStatus('', '');
    loginProgress.style.width = '0%';
    
    // Validações
    if (!username && !password) {
      showStatus('Por favor, preencha todos os campos', 'error');
      usernameInput.focus();
      return false;
    }
    
    if (!username) {
      showStatus('Por favor, digite seu usuário', 'error');
      usernameInput.focus();
      return false;
    }
    
    if (!password) {
      showStatus('Por favor, digite sua senha', 'error');
      passwordInput.focus();
      return false;
    }
    
    return true;
  }

  function setLoadingState(isLoading) {
    if (isLoading) {
      loginBtn.disabled = true;
      btnText.textContent = 'Autenticando...';
      loader.classList.add('active');
      loginBtn.style.opacity = '0.9';
    } else {
      loginBtn.disabled = false;
      btnText.textContent = 'Acessar Sistema';
      loader.classList.remove('active');
      loginBtn.style.opacity = '1';
    }
  }

  function showStatus(message, type) {
    if (!message) {
      loginStatus.textContent = '';
      loginStatus.className = 'status-message';
      return;
    }
    
    loginStatus.textContent = message;
    loginStatus.className = `status-message ${type} show`;
    
    // Auto-esconder após 5 segundos
    if (type === 'success') {
      setTimeout(() => {
        loginStatus.classList.remove('show');
      }, 5000);
    }
  }

  function checkExistingLogin() {
    const token = localStorage.getItem('iot_token');
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.exp > Date.now()) {
            // Token válido, redirecionar
            const redirectTo = sessionStorage.getItem('redirect_after_login') || 'index.html';
            sessionStorage.removeItem('redirect_after_login');
            window.location.href = redirectTo;
          }
        }
      } catch (error) {
        // Token inválido, limpar
        localStorage.removeItem('iot_token');
        localStorage.removeItem('iot_user');
      }
    }
  }

  function loadSavedCredentials() {
    const savedUser = localStorage.getItem('remembered_user');
    if (savedUser) {
      usernameInput.value = savedUser;
      document.getElementById('rememberMe').checked = true;
      passwordInput.focus();
    }
  }

  // Adicionar CSS dinâmico para animações
  const dynamicStyles = `
    @keyframes error-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-10px); }
      75% { transform: translateX(10px); }
    }
    
    .error-shake {
      animation: error-shake 0.5s ease;
    }
    
    .form-group.focused .form-label {
      color: var(--accent-blue);
      transform: translateY(-5px);
    }
    
    .form-group.focused .form-label i {
      color: var(--accent-blue);
      animation: icon-pulse 1s ease;
    }
    
    @keyframes icon-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }
    
    .form-group.has-value .form-input {
      border-color: rgba(0, 242, 255, 0.3);
    }
    
    .login-btn:disabled {
      cursor: not-allowed;
      filter: grayscale(0.5);
    }
  `;
  
  const styleSheet = document.createElement('style');
  styleSheet.textContent = dynamicStyles;
  document.head.appendChild(styleSheet);
});