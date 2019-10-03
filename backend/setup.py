#!/usr/bin/env python
from setuptools import setup, find_packages

from subcellular_experiment.version import VERSION


setup(
    name='subcellular-experiment',
    description='subcellularExperiment(Subcellular experiment app)',
    version=VERSION,
    url='https://subcellular-experiment/',
    author='NSE(Neuroscientific Software Engineering)',
    author_email='bbp-ou-nse@groupes.epfl.ch',

    install_requires=[
        'tornado<6',
        'websocket-client',
        'bluepy',
        'pandas',
        'numpy',
        'pymongo',
        'pysb',
        'cython',
        'sympy'
    ],
    tests_require=['pytest', 'pytest-cov'],
    packages=find_packages(exclude=[]),
    scripts=[],
)
