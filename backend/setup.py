#!/usr/bin/env python
from setuptools import setup, find_packages

from subcellular_experiment.version import VERSION


setup(
    name="subcellular-experiment",
    description="subcellularExperiment(Subcellular experiment app)",
    version=VERSION,
    url="https://subcellular-experiment/",
    author="NSE(Neuroscientific Software Engineering)",
    author_email="bbp-ou-nse@groupes.epfl.ch",
    install_requires=[
        "tornado==6.0.3",
        "wsaccel==0.6.2",
        "pandas==0.25.3",
        "numpy==1.17.2",
        "pymongo==3.11.2",
        "pysb==1.9.1",
        "Cython==0.29.13",
        "sympy==1.5.1",
        "msgpack==0.6.2",
        "xlrd==1.2.0",
        "pydantic==1.6.1",
        "typing-extensions==3.7.4.3",
        "wrapt==1.12.1",
        "sentry-sdk==0.19.5",
        "motor==2.3.0",
        "python-libsbml==5.19.0",
    ],
    tests_require=["pytest", "pytest-cov"],
    packages=find_packages(exclude=[]),
    scripts=[],
)
