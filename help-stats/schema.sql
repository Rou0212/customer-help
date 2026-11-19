CREATE TABLE IF NOT EXISTS question_counts (
 day TEXT NOT NULL, city TEXT NOT NULL, category TEXT NOT NULL,
 count INTEGER NOT NULL DEFAULT 1,
 PRIMARY KEY (day, city, category)
);
CREATE VIEW IF NOT EXISTS city_totals AS
 SELECT city, SUM(count) AS questions FROM question_counts GROUP BY city ORDER BY questions DESC;
CREATE VIEW IF NOT EXISTS city_categories AS
 SELECT city, category, SUM(count) AS questions FROM question_counts GROUP BY city, category ORDER BY city, questions DESC;
