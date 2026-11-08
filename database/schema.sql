CREATE DATABASE IF NOT EXISTS carometro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE carometro;

CREATE TABLE IF NOT EXISTS turmas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alunos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  telefone VARCHAR(20) NOT NULL,
  foto_url VARCHAR(255) NOT NULL,
  turma_id INT NOT NULL,
  INDEX idx_alunos_turma_nome (turma_id, nome),
  CONSTRAINT fk_alunos_turmas
    FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT IGNORE INTO turmas (nome) VALUES
('Turma A'), ('Turma B'), ('Turma C');

INSERT IGNORE INTO alunos (nome, email, telefone, foto_url, turma_id)
SELECT 'Ana Silva', 'ana.silva@escola.com', '(11) 98765-4321', 'https://randomuser.me/api/portraits/women/44.jpg', id FROM turmas WHERE nome = 'Turma A'
UNION ALL
SELECT 'Carlos Oliveira', 'carlos.oliveira@escola.com', '(11) 98765-1234', 'https://randomuser.me/api/portraits/men/32.jpg', id FROM turmas WHERE nome = 'Turma A'
UNION ALL
SELECT 'Mariana Santos', 'mariana.santos@escola.com', '(11) 97865-4321', 'https://randomuser.me/api/portraits/women/68.jpg', id FROM turmas WHERE nome = 'Turma A'
UNION ALL
SELECT 'Pedro Almeida', 'pedro.almeida@escola.com', '(11) 99765-4321', 'https://randomuser.me/api/portraits/men/75.jpg', id FROM turmas WHERE nome = 'Turma A'
UNION ALL
SELECT 'Juliana Costa', 'juliana.costa@escola.com', '(11) 98765-8765', 'https://randomuser.me/api/portraits/women/65.jpg', id FROM turmas WHERE nome = 'Turma A'
UNION ALL
SELECT 'Lucas Ferreira', 'lucas.ferreira@escola.com', '(11) 99965-4321', 'https://randomuser.me/api/portraits/men/45.jpg', id FROM turmas WHERE nome = 'Turma B'
UNION ALL
SELECT 'Gabriela Lima', 'gabriela.lima@escola.com', '(11) 98755-4321', 'https://randomuser.me/api/portraits/women/12.jpg', id FROM turmas WHERE nome = 'Turma B'
UNION ALL
SELECT 'Felipe Rocha', 'felipe.rocha@escola.com', '(11) 98765-4311', 'https://randomuser.me/api/portraits/men/22.jpg', id FROM turmas WHERE nome = 'Turma B'
UNION ALL
SELECT 'Isabela Martins', 'isabela.martins@escola.com', '(11) 94765-4321', 'https://randomuser.me/api/portraits/women/26.jpg', id FROM turmas WHERE nome = 'Turma B'
UNION ALL
SELECT 'Matheus Souza', 'matheus.souza@escola.com', '(11) 95765-4321', 'https://randomuser.me/api/portraits/men/85.jpg', id FROM turmas WHERE nome = 'Turma B'
UNION ALL
SELECT 'Laura Vieira', 'laura.vieira@escola.com', '(11) 98765-1121', 'https://randomuser.me/api/portraits/women/33.jpg', id FROM turmas WHERE nome = 'Turma C'
UNION ALL
SELECT 'Gustavo Pereira', 'gustavo.pereira@escola.com', '(11) 96665-4321', 'https://randomuser.me/api/portraits/men/52.jpg', id FROM turmas WHERE nome = 'Turma C';
