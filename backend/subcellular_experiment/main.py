
import os

from .sim_worker import SimWorker


if __name__ == '__main__':
    if 'MASTER_HOST' in os.environ:
        sim_worker = SimWorker()
        sim_worker.init()
    else:
        import subcellular_experiment.backend
