
// Serviço para integração simples com Dropbox (API HTTP)

const DBX_TOKEN_KEY = 'autocars_dropbox_token';

export const getDropboxAuthUrl = (appKey: string) => {
  const redirectUri = window.location.origin; // O usuário volta para a mesma página
  return `https://www.dropbox.com/oauth2/authorize?client_id=${appKey}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}`;
};

export const saveDropboxToken = (token: string) => {
  localStorage.setItem(DBX_TOKEN_KEY, token);
};

export const getDropboxToken = () => {
  return localStorage.getItem(DBX_TOKEN_KEY);
};

export const clearDropboxToken = () => {
  localStorage.removeItem(DBX_TOKEN_KEY);
};

// Faz upload do arquivo substituindo o existente (Backup)
export const uploadToDropbox = async (jsonContent: string, fileName: string = 'backup_autocars.json') => {
  const token = getDropboxToken();
  if (!token) throw new Error('Usuário não autenticado no Dropbox');

  // API Argument header needs to be JSON stringified
  const args = {
    path: `/${fileName}`,
    mode: 'overwrite',
    autorename: false,
    mute: false
  };

  try {
    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify(args)
      },
      body: jsonContent
    });

    if (!response.ok) {
        if (response.status === 401) {
            clearDropboxToken();
            throw new Error('Sessão expirada. Conecte novamente.');
        }
        const errorData = await response.text();
        throw new Error(`Erro no upload: ${errorData}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Dropbox Upload Error:', error);
    throw error;
  }
};

// Baixa o arquivo de backup
export const downloadFromDropbox = async (fileName: string = 'backup_autocars.json') => {
  const token = getDropboxToken();
  if (!token) throw new Error('Usuário não autenticado no Dropbox');

  const args = {
    path: `/${fileName}`
  };

  try {
    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Dropbox-API-Arg': JSON.stringify(args)
      }
    });

    if (!response.ok) {
         if (response.status === 401) {
            clearDropboxToken();
            throw new Error('Sessão expirada. Conecte novamente.');
        }
        if (response.status === 409) {
             throw new Error('Arquivo de backup não encontrado no Dropbox.');
        }
        throw new Error('Erro ao baixar arquivo do Dropbox');
    }

    // A resposta é o próprio conteúdo do arquivo (blob/text)
    return await response.text();
  } catch (error) {
    console.error('Dropbox Download Error:', error);
    throw error;
  }
};
