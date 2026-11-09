CREATE DATABASE IF NOT EXISTS carometro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE carometro;

CREATE TABLE IF NOT EXISTS turmas (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome (nome)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alunos (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  email VARCHAR(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  telefone VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  foto_url VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  turma_id INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY email (email),
  KEY turma_id (turma_id),
  CONSTRAINT alunos_ibfk_1 FOREIGN KEY (turma_id) REFERENCES turmas (id)
) ENGINE=InnoDB;

INSERT IGNORE INTO turmas (nome) VALUES
('idev100'), ('Turma B'), ('Professores'), ('Turma FIC');

INSERT IGNORE INTO alunos (nome, email, telefone, foto_url, turma_id)
SELECT 'Ana Silva', 'ana.silva@escola.com', '(11) 98765-4321', 'https://randomuser.me/api/portraits/women/44.jpg', id FROM turmas WHERE nome = 'idev100'
UNION ALL
SELECT 'Carlos Oliveira', 'carlos.oliveira@escola.com', '(11) 98765-1234', 'https://randomuser.me/api/portraits/men/32.jpg', id FROM turmas WHERE nome = 'idev100'
UNION ALL
SELECT 'Mariana Santos', 'mariana.santos@escola.com', '(11) 97865-4321', 'https://randomuser.me/api/portraits/women/68.jpg', id FROM turmas WHERE nome = 'idev100'
UNION ALL
SELECT 'Pedro Almeida', 'pedro.almeida@escola.com', '(11) 99765-4321', 'https://randomuser.me/api/portraits/men/75.jpg', id FROM turmas WHERE nome = 'idev100'
UNION ALL
SELECT 'Juliana Costa', 'juliana.costa@escola.com', '(11) 98765-8765', 'https://randomuser.me/api/portraits/women/65.jpg', id FROM turmas WHERE nome = 'Turma B'
UNION ALL
SELECT 'Lucas Ferreira', 'lucas.ferreira@escola.com', '(11) 99965-4321', 'https://randomuser.me/api/portraits/men/45.jpg', id FROM turmas WHERE nome = 'Turma B'
UNION ALL
SELECT 'Gabriela Lima', 'gabriela.lima@escola.com', '(11) 98755-4321', 'https://randomuser.me/api/portraits/women/12.jpg', id FROM turmas WHERE nome = 'Turma B'
UNION ALL
SELECT 'Felipe Rocha', 'felipe.rocha@escola.com', '(11) 98765-4311', 'https://randomuser.me/api/portraits/men/22.jpg', id FROM turmas WHERE nome = 'Turma B'
UNION ALL
SELECT 'Isabela Martins', 'isabela.martins@escola.com', '(11) 94765-4321', 'https://randomuser.me/api/portraits/women/26.jpg', id FROM turmas WHERE nome = 'Turma B'
UNION ALL
SELECT 'Matheus Souza', 'matheus.souza@escola.com', '(11) 95765-4321', 'https://randomuser.me/api/portraits/men/85.jpg', id FROM turmas WHERE nome = 'Professores'
UNION ALL
SELECT 'Laura Vieira', 'laura.vieira@escola.com', '(11) 98765-1121', 'https://randomuser.me/api/portraits/women/33.jpg', id FROM turmas WHERE nome = 'Turma FIC'
UNION ALL
SELECT 'Gustavo Pereira', 'gustavo.pereira@escola.com', '(11) 96665-4321', 'https://randomuser.me/api/portraits/men/52.jpg', id FROM turmas WHERE nome = 'Turma FIC';
