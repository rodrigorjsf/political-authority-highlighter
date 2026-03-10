-- Seed data for development and integration testing
-- Creates 25 sample politicians with integrity scores

INSERT INTO public.politicians (id, external_id, source, name, slug, state, party, role, photo_url, active, tenure_start_date, exclusion_flag)
VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 'camara-1001', 'camara', 'Ana Lima', 'ana-lima-sp', 'SP', 'PT', 'deputado', NULL, TRUE, '2023-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000002', 'camara-1002', 'camara', 'Bruno Costa', 'bruno-costa-rj', 'RJ', 'PL', 'deputado', NULL, TRUE, '2019-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000003', 'camara-1003', 'camara', 'Carla Mendes', 'carla-mendes-mg', 'MG', 'MDB', 'deputado', NULL, TRUE, '2023-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000004', 'camara-1004', 'camara', 'Diego Rocha', 'diego-rocha-ba', 'BA', 'PP', 'deputado', NULL, TRUE, '2015-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000005', 'camara-1005', 'camara', 'Elena Santos', 'elena-santos-rs', 'RS', 'PSDB', 'deputado', NULL, TRUE, '2019-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000006', 'camara-1006', 'camara', 'Felipe Nunes', 'felipe-nunes-pr', 'PR', 'Republicanos', 'deputado', NULL, TRUE, '2023-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000007', 'camara-1007', 'camara', 'Gabriela Faria', 'gabriela-faria-go', 'GO', 'PSD', 'deputado', NULL, TRUE, '2019-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000008', 'camara-1008', 'camara', 'Hugo Barros', 'hugo-barros-pe', 'PE', 'PT', 'deputado', NULL, TRUE, '2015-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000009', 'camara-1009', 'camara', 'Irene Torres', 'irene-torres-ce', 'CE', 'MDB', 'deputado', NULL, TRUE, '2023-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000010', 'camara-1010', 'camara', 'João Alves', 'joao-alves-pa', 'PA', 'PL', 'deputado', NULL, TRUE, '2019-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000011', 'camara-1011', 'camara', 'Karla Pereira', 'karla-pereira-sc', 'SC', 'PP', 'deputado', NULL, TRUE, '2023-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000012', 'camara-1012', 'camara', 'Lucas Gomes', 'lucas-gomes-df', 'DF', 'Avante', 'deputado', NULL, TRUE, '2019-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000013', 'camara-1013', 'camara', 'Mariana Dias', 'mariana-dias-am', 'AM', 'PDT', 'deputado', NULL, TRUE, '2015-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000014', 'camara-1014', 'camara', 'Nelson Pinto', 'nelson-pinto-mt', 'MT', 'PSD', 'deputado', NULL, TRUE, '2023-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000015', 'camara-1015', 'camara', 'Olga Cavalcante', 'olga-cavalcante-pi', 'PI', 'Solidariedade', 'deputado', NULL, TRUE, '2019-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000016', 'senado-2001', 'senado', 'Paulo Rezende', 'paulo-rezende-sp', 'SP', 'PSDB', 'senador', NULL, TRUE, '2019-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000017', 'senado-2002', 'senado', 'Quenia Moura', 'quenia-moura-rj', 'RJ', 'PT', 'senador', NULL, TRUE, '2015-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000018', 'senado-2003', 'senado', 'Roberto Leite', 'roberto-leite-mg', 'MG', 'MDB', 'senador', NULL, TRUE, '2023-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000019', 'senado-2004', 'senado', 'Sara Oliveira', 'sara-oliveira-ba', 'BA', 'PL', 'senador', NULL, TRUE, '2019-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000020', 'senado-2005', 'senado', 'Tiago Melo', 'tiago-melo-rs', 'RS', 'PP', 'senador', NULL, TRUE, '2015-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000021', 'senado-2006', 'senado', 'Ursula Campos', 'ursula-campos-pr', 'PR', 'PSD', 'senador', NULL, TRUE, '2023-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000022', 'senado-2007', 'senado', 'Vitor Souza', 'vitor-souza-go', 'GO', 'Republicanos', 'senador', NULL, TRUE, '2019-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000023', 'senado-2008', 'senado', 'Wanda Ferreira', 'wanda-ferreira-pe', 'PE', 'PDT', 'senador', NULL, TRUE, '2015-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000024', 'senado-2009', 'senado', 'Xavier Cruz', 'xavier-cruz-ce', 'CE', 'PT', 'senador', NULL, TRUE, '2023-02-01', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000025', 'senado-2010', 'senado', 'Yara Lima', 'yara-lima-pa', 'PA', 'MDB', 'senador', NULL, TRUE, '2019-02-01', FALSE)
ON CONFLICT (external_id) DO NOTHING;

INSERT INTO public.integrity_scores (politician_id, overall_score, transparency_score, legislative_score, financial_score, anticorruption_score, exclusion_flag, methodology_version)
VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 92, 24, 23, 22, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000002', 85, 22, 20, 18, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000003', 78, 20, 18, 15, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000004', 71, 18, 16, 12, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000005', 68, 17, 15, 11, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000006', 65, 16, 14, 10, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000007', 62, 15, 13, 9, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000008', 58, 14, 12, 7, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000009', 55, 13, 11, 6, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000010', 50, 12, 10, 3, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000011', 47, 11, 9, 2, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000012', 43, 10, 8, 0, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000013', 40, 9, 7, 0, 25, FALSE, '1.0'),  -- DR-001: anticorruption=0 possible
  ('a1b2c3d4-0001-0001-0001-000000000014', 35, 8, 6, 0, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000015', 30, 7, 5, 0, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000016', 88, 23, 21, 19, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000017', 82, 21, 19, 17, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000018', 76, 19, 17, 15, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000019', 72, 18, 16, 13, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000020', 66, 16, 14, 11, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000021', 60, 14, 12, 9, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000022', 54, 12, 10, 7, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000023', 48, 10, 8, 5, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000024', 42, 9, 7, 1, 25, FALSE, '1.0'),
  ('a1b2c3d4-0001-0001-0001-000000000025', 36, 8, 5, 0, 25, FALSE, '1.0')
ON CONFLICT DO NOTHING;
