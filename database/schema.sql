CREATE DATABASE IF NOT EXISTS carometro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE carometro;

DROP TABLE IF EXISTS alunos;
DROP TABLE IF EXISTS turmas;

CREATE TABLE turmas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE alunos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  telefone VARCHAR(20) NOT NULL,
  foto_url VARCHAR(255) NOT NULL,
  turma_id INT NOT NULL,
  FOREIGN KEY (turma_id) REFERENCES turmas(id)
);

INSERT INTO turmas (nome) VALUES ('Turma A'), ('Turma B'), ('Turma C');

INSERT INTO alunos (nome, email, telefone, foto_url, turma_id) VALUES
('Ana Silva', 'ana.silva@escola.com', '(11) 98765-4321', 'https://randomuser.me/api/portraits/women/44.jpg', 1),
('Carlos Oliveira', 'carlos.oliveira@escola.com', '(11) 98765-1234', 'https://randomuser.me/api/portraits/men/32.jpg', 1),
('Mariana Santos', 'mariana.santos@escola.com', '(11) 97865-4321', 'https://randomuser.me/api/portraits/women/68.jpg', 1),
('Pedro Almeida', 'pedro.almeida@escola.com', '(11) 99765-4321', 'https://randomuser.me/api/portraits/men/75.jpg', 1),
('Juliana Costa', 'juliana.costa@escola.com', '(11) 98765-8765', 'https://randomuser.me/api/portraits/women/65.jpg', 1),
('Lucas Ferreira', 'lucas.ferreira@escola.com', '(11) 99965-4321', 'https://randomuser.me/api/portraits/men/45.jpg', 2),
('Gabriela Lima', 'gabriela.lima@escola.com', '(11) 98755-4321', 'https://randomuser.me/api/portraits/women/12.jpg', 2),
('Felipe Rocha', 'felipe.rocha@escola.com', '(11) 98765-4311', 'https://randomuser.me/api/portraits/men/22.jpg', 2),
('Isabela Martins', 'isabela.martins@escola.com', '(11) 94765-4321', 'https://randomuser.me/api/portraits/women/26.jpg', 2),
('Matheus Souza', 'matheus.souza@escola.com', '(11) 95765-4321', 'https://randomuser.me/api/portraits/men/85.jpg', 2),
('Laura Vieira', 'laura.vieira@escola.com', '(11) 98765-1121', 'https://randomuser.me/api/portraits/women/33.jpg', 3),
('Gustavo Pereira', 'gustavo.pereira@escola.com', '(11) 96665-4321', 'https://randomuser.me/api/portraits/men/52.jpg', 3);
