
import os
import bluepy

circuit = bluepy.Circuit(os.getenv('CIRCUIT_PATH'))
morphology_list = circuit.v2.cells.get()['morphology'].unique().tolist()

f = open("circuit-morphology-list.txt", 'w')

for m in morphology_list:
  f.write("%s\n" % m)

print('circuit-morphology-list.txt has been generated in /tmp')
