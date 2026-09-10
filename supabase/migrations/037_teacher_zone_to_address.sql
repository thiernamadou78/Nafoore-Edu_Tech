-- L'adresse "presentiel" ajoutee precedemment n'a pas de sens (c'est le prof
-- qui se deplace, pas la famille) : on la retire et on renomme "zone" en
-- "address" pour n'avoir plus qu'un seul champ de repere geographique.

ALTER TABLE teachers DROP COLUMN IF EXISTS address;
ALTER TABLE teachers RENAME COLUMN zone TO address;
