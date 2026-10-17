INSERT INTO "flight_schedules" ("airline","flightNumber","fromCode","toCode","fromName","toName","departure","arrival","duration","stops","price","active","createdBy")
SELECT v.airline, v.flight_number, v.from_code, v.to_code, v.from_name, v.to_name, v.departure, v.arrival, v.duration, v.stops, v.price, 1, u.id
FROM (VALUES
  ('Bluebird Airways','BB204','JFK','LHR','New York','London','08:10','20:05','6h 55m','Non-stop',737.00),
  ('British Airways','BA178','JFK','LHR','New York','London','21:30','09:25','6h 55m','Non-stop',812.00),
  ('Air Canada','AC872','YYZ','CDG','Toronto','Paris','18:40','07:20','7h 40m','Non-stop',812.00),
  ('Lufthansa','LH463','MIA','FRA','Miami','Frankfurt','16:45','07:10','9h 25m','Non-stop',774.00),
  ('LATAM Airlines','LA501','JFK','SCL','New York','Santiago','20:00','07:35','10h 35m','Non-stop',698.00),
  ('United Airlines','UA78','LAX','AMS','Los Angeles','Amsterdam','16:15','12:35','11h 20m','Single layover',905.00),
  ('Air France','AF65','LAX','CDG','Los Angeles','Paris','13:40','09:15','10h 35m','Non-stop',918.00)
) AS v(airline,flight_number,from_code,to_code,from_name,to_name,departure,arrival,duration,stops,price)
CROSS JOIN (SELECT id FROM "users" WHERE role = 'admin' ORDER BY id LIMIT 1) u
WHERE NOT EXISTS (SELECT 1 FROM "flight_schedules");
